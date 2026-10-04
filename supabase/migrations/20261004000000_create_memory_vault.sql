begin;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_type text not null,
  source_location text not null,
  source_date timestamptz not null,
  original_content text not null,
  created_at timestamptz not null default now(),
  constraint sources_user_id_fkey
    foreign key (user_id) references public.users (id) on delete restrict,
  constraint sources_id_user_id_key unique (id, user_id)
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  content text not null,
  type text not null,
  entity text not null,
  scope text not null default 'user',
  confidence numeric(4, 3) not null default 1.000,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  supersedes uuid,
  source_id uuid not null,
  constraint memories_user_id_fkey
    foreign key (user_id) references public.users (id) on delete restrict,
  constraint memories_source_user_fkey
    foreign key (source_id, user_id)
    references public.sources (id, user_id) on delete restrict,
  constraint memories_supersedes_user_fkey
    foreign key (supersedes, user_id)
    references public.memories (id, user_id) on delete restrict,
  constraint memories_id_user_id_key unique (id, user_id),
  constraint memories_type_check
    check (type in ('fact', 'preference', 'decision', 'event', 'technical_decision')),
  constraint memories_status_check
    check (status in ('active', 'superseded', 'forgotten')),
  constraint memories_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint memories_validity_check
    check (valid_until is null or valid_until > valid_from),
  constraint memories_active_validity_check
    check (status <> 'active' or valid_until is null),
  constraint memories_no_self_supersession_check
    check (supersedes is null or supersedes <> id)
);

create index sources_user_date_idx
  on public.sources (user_id, source_date desc);

create index memories_user_status_valid_from_idx
  on public.memories (user_id, status, valid_from desc);

create index memories_user_entity_scope_status_idx
  on public.memories (user_id, entity, scope, status);

create index memories_source_user_idx
  on public.memories (source_id, user_id);

create index memories_supersedes_user_idx
  on public.memories (supersedes, user_id)
  where supersedes is not null;

alter table public.users enable row level security;
alter table public.sources enable row level security;
alter table public.memories enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.sources from anon, authenticated;
revoke all on table public.memories from anon, authenticated;

grant all on table public.users to service_role;
grant all on table public.sources to service_role;
grant all on table public.memories to service_role;

comment on column public.memories.supersedes is
  'The immediately previous memory version replaced by this row.';

commit;