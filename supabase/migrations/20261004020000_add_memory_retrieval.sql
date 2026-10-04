begin;

alter table public.memories
  add column search_vector tsvector generated always as (
    setweight(
      to_tsvector('english'::regconfig, coalesce(content, '')),
      'A'
    ) ||
    setweight(
      to_tsvector('simple'::regconfig, coalesce(entity, '')),
      'B'
    ) ||
    setweight(
      to_tsvector('simple'::regconfig, coalesce(scope, '')),
      'C'
    )
  ) stored;

create index memories_search_vector_idx
  on public.memories using gin (search_vector);

create or replace function public.retrieve_memory_candidates(
  p_user_id uuid,
  p_query text,
  p_limit integer default 100
)
returns table (
  id uuid,
  user_id uuid,
  content text,
  type text,
  entity text,
  scope text,
  confidence numeric,
  status text,
  created_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  supersedes uuid,
  source_id uuid,
  text_rank real
)
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  v_and_query tsquery;
  v_or_query tsquery;
begin
  v_and_query := pg_catalog.websearch_to_tsquery('english'::regconfig, p_query);
  v_or_query := pg_catalog.to_tsquery(
    'english'::regconfig,
    pg_catalog.regexp_replace(v_and_query::text, ' & ', ' | ', 'g')
  );

  return query
    select
      memories.id,
      memories.user_id,
      memories.content,
      memories.type,
      memories.entity,
      memories.scope,
      memories.confidence,
      memories.status,
      memories.created_at,
      memories.valid_from,
      memories.valid_until,
      memories.supersedes,
      memories.source_id,
      greatest(
        pg_catalog.ts_rank_cd(memories.search_vector, v_and_query),
        pg_catalog.ts_rank_cd(memories.search_vector, v_or_query)
      )::real as text_rank
    from public.memories as memories
    where memories.user_id = p_user_id
      and memories.status in ('active', 'superseded')
      and (
        memories.status = 'active'
        or memories.search_vector @@ v_and_query
        or memories.search_vector @@ v_or_query
      )
    order by
      (
        memories.search_vector @@ v_and_query
        or memories.search_vector @@ v_or_query
      ) desc,
      text_rank desc,
      (memories.status = 'active') desc,
      memories.valid_from desc
    limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$function$;

revoke all on function public.retrieve_memory_candidates(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.retrieve_memory_candidates(uuid, text, integer)
  to service_role;

commit;