-- Ensure session_minutes is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'session_minutes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_minutes;
  END IF;
END $$;