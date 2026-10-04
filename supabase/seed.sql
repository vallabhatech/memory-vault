insert into public.users (id, display_name, created_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'Demo User',
  '2025-01-01 12:00:00+00'
)
on conflict (id) do nothing;

insert into public.sources (
  id,
  user_id,
  source_type,
  source_location,
  source_date,
  original_content,
  created_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'conversation',
    'demo/timeline/day-1',
    '2025-01-01 12:00:00+00',
    'The project uses React.',
    '2025-01-01 12:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'conversation',
    'demo/timeline/day-3',
    '2025-01-03 12:00:00+00',
    'We switched the project to Next.js.',
    '2025-01-03 12:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    'conversation',
    'demo/timeline/day-5',
    '2025-01-05 12:00:00+00',
    'We went back to React.',
    '2025-01-05 12:00:00+00'
  )
on conflict (id) do nothing;

insert into public.memories (
  id,
  user_id,
  content,
  type,
  entity,
  scope,
  confidence,
  status,
  created_at,
  valid_from,
  valid_until,
  supersedes,
  source_id
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'The project uses React.',
    'technical_decision',
    'project.framework',
    'project',
    1.000,
    'superseded',
    '2025-01-01 12:00:00+00',
    '2025-01-01 12:00:00+00',
    '2025-01-03 12:00:00+00',
    null,
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'We switched the project to Next.js.',
    'technical_decision',
    'project.framework',
    'project',
    1.000,
    'superseded',
    '2025-01-03 12:00:00+00',
    '2025-01-03 12:00:00+00',
    '2025-01-05 12:00:00+00',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    'We went back to React.',
    'technical_decision',
    'project.framework',
    'project',
    1.000,
    'active',
    '2025-01-05 12:00:00+00',
    '2025-01-05 12:00:00+00',
    null,
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000005'
  )
on conflict (id) do nothing;