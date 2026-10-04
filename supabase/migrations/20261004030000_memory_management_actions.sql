begin;

create or replace function public.manage_memory(
  p_user_id uuid,
  p_memory_id uuid,
  p_action text,
  p_content text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_memory public.memories%rowtype;
  v_changed_at timestamptz;
  v_source_id uuid;
  v_new_memory_id uuid;
begin
  if p_action is null or p_action not in ('confirm', 'edit', 'forget') then
    raise exception 'Unsupported memory action.' using errcode = '22023';
  end if;

  select memories.*
    into v_memory
    from public.memories as memories
    where memories.id = p_memory_id
      and memories.user_id = p_user_id;

  if not found then
    raise exception 'Memory was not found.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || v_memory.entity || ':' || v_memory.scope,
      0
    )
  );

  select memories.*
    into v_memory
    from public.memories as memories
    where memories.id = p_memory_id
      and memories.user_id = p_user_id
    for update;

  if not found then
    raise exception 'Memory was not found.' using errcode = '22023';
  end if;

  v_changed_at := greatest(
    pg_catalog.clock_timestamp(),
    v_memory.valid_from + interval '1 microsecond'
  );

  if p_action = 'confirm' then
    if v_memory.status = 'forgotten' then
      raise exception 'Forgotten memories cannot be confirmed.' using errcode = '22023';
    end if;

    update public.memories
      set confidence = 1.000
      where id = p_memory_id and user_id = p_user_id;

    return pg_catalog.jsonb_build_object(
      'action', p_action,
      'memory_id', p_memory_id,
      'status', v_memory.status,
      'confidence', 1.000
    );
  end if;

  if p_action = 'forget' then
    if v_memory.status <> 'forgotten' then
      update public.memories
        set status = 'forgotten',
            valid_until = coalesce(valid_until, v_changed_at)
        where id = p_memory_id and user_id = p_user_id;
    end if;

    return pg_catalog.jsonb_build_object(
      'action', p_action,
      'memory_id', p_memory_id,
      'status', 'forgotten',
      'deleted', false
    );
  end if;

  if v_memory.status <> 'active' then
    raise exception 'Only active memories can be edited; history is immutable.'
      using errcode = '22023';
  end if;

  if p_content is null or pg_catalog.char_length(pg_catalog.btrim(p_content)) = 0
     or pg_catalog.char_length(pg_catalog.btrim(p_content)) > 5000 then
    raise exception 'Edited content must be between 1 and 5,000 characters.'
      using errcode = '22023';
  end if;

  update public.memories
    set status = 'superseded', valid_until = v_changed_at
    where id = p_memory_id and user_id = p_user_id and status = 'active';

  if not found then
    raise exception 'Memory is no longer active.' using errcode = '22023';
  end if;

  insert into public.sources (
    user_id,
    source_type,
    source_location,
    source_date,
    original_content
  ) values (
    p_user_id,
    'manual_edit',
    'memory/page',
    v_changed_at,
    pg_catalog.btrim(p_content)
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
    pg_catalog.btrim(p_content),
    v_memory.type,
    v_memory.entity,
    v_memory.scope,
    v_memory.confidence,
    'active',
    v_changed_at,
    p_memory_id,
    v_source_id
  ) returning id into v_new_memory_id;

  return pg_catalog.jsonb_build_object(
    'action', p_action,
    'memory_id', v_new_memory_id,
    'superseded_memory_id', p_memory_id,
    'status', 'active'
  );
end;
$function$;

revoke all on function public.manage_memory(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.manage_memory(uuid, uuid, text, text)
  to service_role;

commit;