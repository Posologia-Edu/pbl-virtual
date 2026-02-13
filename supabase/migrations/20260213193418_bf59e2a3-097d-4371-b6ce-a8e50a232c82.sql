-- Add timer persistence columns to rooms table
ALTER TABLE public.rooms
  ADD COLUMN timer_end_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN timer_running boolean DEFAULT false;