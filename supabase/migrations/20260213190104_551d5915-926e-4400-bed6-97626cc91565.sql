
-- Add foreign key from step_items.author_id to profiles.user_id
ALTER TABLE public.step_items
ADD CONSTRAINT step_items_author_id_profiles_fkey
FOREIGN KEY (author_id) REFERENCES public.profiles(user_id);

-- Add foreign key from chat_messages.user_id to profiles.user_id
ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
