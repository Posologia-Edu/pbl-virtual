
-- Drop the old unique constraint that doesn't account for archived status
ALTER TABLE public.evaluations DROP CONSTRAINT evaluations_room_id_student_id_criterion_id_key;

-- Create a partial unique index only for non-archived evaluations
CREATE UNIQUE INDEX evaluations_active_unique ON public.evaluations (room_id, student_id, criterion_id) WHERE archived = false;
