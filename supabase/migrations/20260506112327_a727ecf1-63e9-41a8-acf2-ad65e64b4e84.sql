
ALTER TABLE public.presentation_comments
  ADD CONSTRAINT presentation_comments_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.session_objective_references
  ADD CONSTRAINT session_objective_references_reference_id_fkey
  FOREIGN KEY (reference_id) REFERENCES public.session_references(id) ON DELETE CASCADE;

ALTER TABLE public.session_objective_references
  ADD CONSTRAINT session_objective_references_objective_step_item_id_fkey
  FOREIGN KEY (objective_step_item_id) REFERENCES public.step_items(id) ON DELETE CASCADE;
