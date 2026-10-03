create or replace function public.get_recent_activations()
returns table(first_name text, company_name text, activated_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select split_part(trim(p.full_name), ' ', 1), c.name, s.updated_at
  from subscriptions s
  join companies c on c.id = s.company_id
  join lateral (
    select m.user_id from memberships m
    where m.company_id = c.id and m.role = 'owner'::app_role and m.active
    order by m.created_at limit 1
  ) o on true
  join profiles p on p.id = o.user_id
  left join profiles pa on pa.id = o.user_id and pa.is_admin
  where s.status = 'active' and pa.id is null
    and coalesce(trim(p.full_name), '') <> ''
  order by s.updated_at desc
  limit 20;
$$;
revoke all on function public.get_recent_activations() from public;
grant execute on function public.get_recent_activations() to anon, authenticated;