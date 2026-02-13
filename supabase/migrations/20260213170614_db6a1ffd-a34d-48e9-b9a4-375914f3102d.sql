
-- 1. Role enum
create type public.app_role as enum ('admin', 'professor', 'student');

-- 2. Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null default '',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Anyone can view profiles" on public.profiles for select to authenticated using (true);
create policy "Own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "Own profile update" on public.profiles for update to authenticated using (auth.uid() = user_id);

-- 3. Auto-create profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 4. User roles (create BEFORE has_role function)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

-- 5. Security definer function (now user_roles exists)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- 6. RLS for user_roles
create policy "View own or admin roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admin insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin update roles" on public.user_roles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 7. Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  professor_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);
alter table public.groups enable row level security;

-- 8. Group members
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  unique(group_id, student_id)
);
alter table public.group_members enable row level security;

-- 9. Groups RLS (after group_members exists)
create policy "View groups" on public.groups for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or professor_id = auth.uid() or
  exists (select 1 from public.group_members gm where gm.group_id = id and gm.student_id = auth.uid())
);
create policy "Admin insert groups" on public.groups for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin update groups" on public.groups for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin delete groups" on public.groups for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 10. Group members RLS
create policy "View members" on public.group_members for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or student_id = auth.uid() or
  exists (select 1 from public.groups g where g.id = group_id and g.professor_id = auth.uid())
);
create policy "Admin insert members" on public.group_members for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin delete members" on public.group_members for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 11. Rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id uuid references public.groups(id) on delete cascade not null,
  professor_id uuid references auth.users(id) not null,
  scenario text,
  tutor_glossary jsonb,
  tutor_questions jsonb,
  current_step int default 0,
  is_scenario_released boolean default false,
  status text default 'active',
  coordinator_id uuid references auth.users(id),
  reporter_id uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.rooms enable row level security;
create policy "View rooms" on public.rooms for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or professor_id = auth.uid() or
  exists (select 1 from public.group_members gm where gm.group_id = rooms.group_id and gm.student_id = auth.uid())
);
create policy "Professor insert rooms" on public.rooms for insert to authenticated with check (professor_id = auth.uid());
create policy "Professor update rooms" on public.rooms for update to authenticated using (professor_id = auth.uid());
create policy "Professor delete rooms" on public.rooms for delete to authenticated using (professor_id = auth.uid());

-- 12. Step items
create table public.step_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  step int not null,
  content text not null,
  author_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);
alter table public.step_items enable row level security;
create policy "View step items" on public.step_items for select to authenticated using (
  exists (select 1 from public.rooms r where r.id = room_id and (
    r.professor_id = auth.uid() or
    exists (select 1 from public.group_members gm where gm.group_id = r.group_id and gm.student_id = auth.uid())
  ))
);
create policy "Insert step items" on public.step_items for insert to authenticated with check (author_id = auth.uid());
create policy "Delete own step items" on public.step_items for delete to authenticated using (author_id = auth.uid());

-- 13. Chat messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz default now()
);
alter table public.chat_messages enable row level security;
create policy "View chat" on public.chat_messages for select to authenticated using (
  exists (select 1 from public.rooms r where r.id = room_id and (
    r.professor_id = auth.uid() or
    exists (select 1 from public.group_members gm where gm.group_id = r.group_id and gm.student_id = auth.uid())
  ))
);
create policy "Send chat" on public.chat_messages for insert to authenticated with check (user_id = auth.uid());

-- 14. Evaluation criteria
create table public.evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  phase text not null,
  label text not null,
  sort_order int default 0
);
alter table public.evaluation_criteria enable row level security;
create policy "View criteria" on public.evaluation_criteria for select to authenticated using (
  exists (select 1 from public.rooms r where r.id = room_id and (
    r.professor_id = auth.uid() or
    exists (select 1 from public.group_members gm where gm.group_id = r.group_id and gm.student_id = auth.uid())
  ))
);
create policy "Professor insert criteria" on public.evaluation_criteria for insert to authenticated with check (
  exists (select 1 from public.rooms r where r.id = room_id and r.professor_id = auth.uid())
);
create policy "Professor update criteria" on public.evaluation_criteria for update to authenticated using (
  exists (select 1 from public.rooms r where r.id = room_id and r.professor_id = auth.uid())
);
create policy "Professor delete criteria" on public.evaluation_criteria for delete to authenticated using (
  exists (select 1 from public.rooms r where r.id = room_id and r.professor_id = auth.uid())
);

-- 15. Evaluations
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  student_id uuid references auth.users(id) not null,
  criterion_id uuid references public.evaluation_criteria(id) on delete cascade not null,
  grade text,
  professor_id uuid references auth.users(id) not null,
  archived boolean default false,
  created_at timestamptz default now(),
  unique(room_id, student_id, criterion_id)
);
alter table public.evaluations enable row level security;
create policy "Professor manage evals" on public.evaluations for all to authenticated using (professor_id = auth.uid());
create policy "Student view own evals" on public.evaluations for select to authenticated using (student_id = auth.uid());

-- 16. Default criteria trigger
create or replace function public.create_default_criteria()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.evaluation_criteria (room_id, phase, label, sort_order) values
    (new.id, 'opening', 'Identificação de termos desconhecidos', 1),
    (new.id, 'opening', 'Definição do problema central', 2),
    (new.id, 'opening', 'Formulação de hipóteses', 3),
    (new.id, 'opening', 'Participação ativa no brainstorming', 4),
    (new.id, 'opening', 'Contribuição para objetivos de aprendizagem', 5),
    (new.id, 'closing', 'Domínio do conteúdo estudado', 1),
    (new.id, 'closing', 'Capacidade de síntese', 2),
    (new.id, 'closing', 'Integração de conhecimentos', 3),
    (new.id, 'closing', 'Comunicação e clareza', 4),
    (new.id, 'closing', 'Pensamento crítico', 5);
  return new;
end;
$$;
create trigger on_room_created after insert on public.rooms for each row execute function public.create_default_criteria();

-- 17. Enable realtime
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.step_items;
alter publication supabase_realtime add table public.rooms;
