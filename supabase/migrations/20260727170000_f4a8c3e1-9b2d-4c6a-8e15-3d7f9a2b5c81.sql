-- ============================================================
-- Support ticket system: tables, ticket-number sequence, RLS,
-- participant helper, private storage bucket, realtime.
-- ============================================================

-- 1. Ticket number sequence
CREATE SEQUENCE public.support_ticket_number_seq START WITH 1;

-- 2. Tables
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('billing', 'technical', 'bug', 'feature_request', 'account', 'other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_customer', 'pending_admin', 'resolved', 'closed')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_created_by_profiles_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_ticket_messages_sender_id_profiles_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_ticket_attachments_uploader_id_profiles_fkey FOREIGN KEY (uploader_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- 3. Ticket number auto-fill (client never supplies this)
CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'SUP-' || lpad(nextval('public.support_ticket_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_support_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.generate_support_ticket_number();

-- 4. Server-side institution resolution (never trust a client-supplied value)
CREATE OR REPLACE FUNCTION public.resolve_institution_for_user(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT id FROM public.institutions WHERE owner_id = _user_id LIMIT 1),
    (SELECT c.institution_id FROM public.course_members cm
       JOIN public.courses c ON c.id = cm.course_id
       WHERE cm.user_id = _user_id
       LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.set_support_ticket_institution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  NEW.institution_id := public.resolve_institution_for_user(NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_support_ticket_institution_trg
BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_support_ticket_institution();

-- 5. Auto-bump last_message_at / queue status on new message
CREATE OR REPLACE FUNCTION public.touch_support_ticket_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = now(),
      updated_at = now(),
      status = CASE
        WHEN NEW.sender_role = 'admin' THEN 'pending_customer'
        WHEN NEW.sender_role = 'customer' THEN 'pending_admin'
        ELSE status
      END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_support_ticket_on_message_trg
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket_on_message();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Participant helper (mirrors is_institution_admin's pattern)
CREATE OR REPLACE FUNCTION public.is_support_ticket_participant(_ticket_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = _ticket_id
      AND (t.created_by = _user_id OR public.has_role(_user_id, 'admin'::app_role))
  )
$$;

-- 7. RLS: support_tickets
-- No customer UPDATE policy on purpose: subject/category/status are not
-- customer-editable after creation. Status changes are admin-only and go
-- through support-ticket-notify so the customer gets emailed.
CREATE POLICY "Customers view own tickets"
ON public.support_tickets FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Customers create own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Admin manage all tickets"
ON public.support_tickets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. RLS: support_ticket_messages
CREATE POLICY "Participants view messages"
ON public.support_ticket_messages FOR SELECT
USING (public.is_support_ticket_participant(ticket_id, auth.uid()));

CREATE POLICY "Participants insert own messages"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    (sender_role = 'admin' AND has_role(auth.uid(), 'admin'::app_role))
    OR (sender_role = 'customer' AND EXISTS (
          SELECT 1 FROM public.support_tickets t
          WHERE t.id = ticket_id AND t.created_by = auth.uid()
        ))
  )
);

-- 9. RLS: support_ticket_attachments
CREATE POLICY "Participants view attachments"
ON public.support_ticket_attachments FOR SELECT
USING (public.is_support_ticket_participant(ticket_id, auth.uid()));

CREATE POLICY "Participants insert own attachments"
ON public.support_ticket_attachments FOR INSERT
WITH CHECK (uploader_id = auth.uid() AND public.is_support_ticket_participant(ticket_id, auth.uid()));

-- 10. Storage bucket (private, ticket-scoped path, not user-scoped —
-- both the customer and the (different-user) admin need access to the
-- same ticket's files).
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-tickets', 'support-tickets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Participants upload ticket files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-tickets'
  AND public.is_support_ticket_participant(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Participants view ticket files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-tickets'
  AND public.is_support_ticket_participant(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 11. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
