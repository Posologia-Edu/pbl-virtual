-- Add missing FK from session_references.author_id to profiles.user_id
ALTER TABLE public.session_references
  ADD CONSTRAINT session_references_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(user_id);