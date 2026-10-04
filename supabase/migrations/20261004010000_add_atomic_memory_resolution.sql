begin;

create or replace function public.apply_memory_resolution(
  p_user_id uuid,
  p_candidate_memory_ids uuid[],
  p_memory jsonb,
  p_source jsonb,
  p_action text,
  p_superseded_memory_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_memory_id uuid;
  v_source_id uuid;
  v_valid_from timestamptz;
  v_entity text;
  v_scope text;
  v_expected_count integer;
  v_updated_count integer;
  v_active_count integer;
  v_supersedes uuid;
begin
  if p_action not in ('add', 'duplicate', 'supersede') then
    raise exception 'Invalid memory resolution action.' using errcode = '22023';
  end if;

  v_valid_from := coalesce(
    nullif(p_memory ->> 'valid_from', '')::timestamptz,
    pg_catalog.now()
  );
  v_entity := nullif(pg_catalog.btrim(p_memory ->> 'entity'), '');
  v_scope := nullif(pg_catalog.btrim(p_memory ->> 'scope'), '');

  if v_entity is null or v_scope is null then
    raise exception 'Memory entity and scope are required.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || v_entity || ':' || v_scope,
      0
    )
  );

  select pg_catalog.count(*)::integer
    into v_active_count
    from public.memories as memories
    where memories.user_id = p_user_id
      and memories.entity = v_entity
      and memories.scope = v_scope
      and memories.status = 'active';

  if v_active_count <> coalesce(pg_catalog.cardinality(p_candidate_memory_ids), 0)
     or exists (
       select 1
         from public.memories as memories
         where memories.user_id = p_user_id
           and memories.entity = v_entity
           and memories.scope = v_scope
           and memories.status = 'active'
           and not (memories.id = any(coalesce(p_candidate_memory_ids, '{}'::uuid[])))
     ) then
    raise exception 'The active memory candidates changed during classification.'
      using errcode = '40001';
  end if;

  if p_action = 'duplicate' then
    if pg_catalog.cardinality(p_superseded_memory_ids) <> 1 then
      raise exception 'A duplicate must identify exactly one active memory.'
        using errcode = '22023';
    end if;

    select memories.id
      into v_memory_id
      from public.memories as memories
      where memories.id = p_superseded_memory_ids[1]
        and memories.user_id = p_user_id
        and memories.entity = v_entity
        and memories.scope = v_scope
        and memories.status = 'active';

    if v_memory_id is null then
      raise exception 'The duplicate candidate is no longer active.'
        using errcode = '22023';
    end if;

    return pg_catalog.jsonb_build_object(
      'memory_id', v_memory_id,
      'inserted', false
    );
  end if;

  v_expected_count := coalesce(pg_catalog.cardinality(p_superseded_memory_ids), 0);
  if (p_action = 'add' and v_expected_count <> 0)
     or (p_action = 'supersede' and v_expected_count = 0) then
    raise exception 'The action does not match the superseded memory IDs.'
      using errcode = '22023';
  end if;

  if v_expected_count > 0 then
    select pg_catalog.count(*)::integer
      into v_updated_count
      from public.memories as memories
      where memories.id = any(p_superseded_memory_ids)
        and memories.user_id = p_user_id
        and memories.entity = v_entity
        and memories.scope = v_scope
        and memories.status = 'active'
        and memories.valid_from < v_valid_from;

    if v_updated_count <> v_expected_count then
      raise exception 'A superseded candidate changed or is later than the new memory.'
        using errcode = '22023';
    end if;

    select memories.id
      into v_supersedes
      from public.memories as memories
      where memories.id = any(p_superseded_memory_ids)
        and memories.user_id = p_user_id
        and memories.entity = v_entity
        and memories.scope = v_scope
      order by memories.valid_from desc, memories.created_at desc
      limit 1;

    update public.memories as memories
      set status = 'superseded', valid_until = v_valid_from
      where memories.id = any(p_superseded_memory_ids)
        and memories.user_id = p_user_id
        and memories.entity = v_entity
        and memories.scope = v_scope
        and memories.status = 'active';

    get diagnostics v_updated_count = row_count;
    if v_updated_count <> v_expected_count then
      raise exception 'A superseded candidate changed during resolution.'
        using errcode = '22023';
    end if;
  end if;

  insert into public.sources (
    user_id,
    source_type,
    source_location,
    source_date,
    original_content
  ) values (
    p_user_id,
    coalesce(nullif(pg_catalog.btrim(p_source ->> 'source_type'), ''), 'conversation'),
    coalesce(nullif(pg_catalog.btrim(p_source ->> 'source_location'), ''), 'chat/manual'),
    coalesce(nullif(p_source ->> 'source_date', '')::timestamptz, v_valid_from),
    coalesce(p_source ->> 'original_content', p_memory ->> 'content')
  ) returning id into v_source_id;

  insert into public.memories (
    user_id,
    content,
    type,
    entity,
    scope,
    confidence,
    status,
    valid_from,
    supersedes,
    source_id
  ) values (
    p_user_id,
    p_memory ->> 'content',
    p_memory ->> 'type',
    v_entity,
    v_scope,
    coalesce((p_memory ->> 'confidence')::numeric, 1.000),
    'active',
    v_valid_from,
    v_supersedes,
    v_source_id
  ) returning id into v_memory_id;

  return pg_catalog.jsonb_build_object(
    'memory_id', v_memory_id,
    'inserted', true,
    'superseded_memory_ids', coalesce(to_jsonb(p_superseded_memory_ids), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.apply_memory_resolution(uuid, uuid[], jsonb, jsonb, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.apply_memory_resolution(uuid, uuid[], jsonb, jsonb, text, uuid[])
  to service_role;

commit;