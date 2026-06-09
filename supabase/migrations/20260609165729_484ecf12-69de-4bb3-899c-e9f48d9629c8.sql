ALTER TABLE public.tutorial_sessions
  ADD COLUMN IF NOT EXISTS patient_interview_phase text CHECK (patient_interview_phase IN ('opening','closing')),
  ADD COLUMN IF NOT EXISTS patient_interview_end_at timestamptz;