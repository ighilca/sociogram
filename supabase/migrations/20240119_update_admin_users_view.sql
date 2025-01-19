-- Drop existing view
drop view if exists public.admin_users;

-- Create updated view for users
create or replace view public.admin_users as
select 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  not coalesce(u.disabled, false) as is_active,
  au.role as user_role,
  au.raw_user_meta_data
from auth.users au
left join public.users u on u.id = au.id
order by au.created_at desc;

-- Enable RLS on the view
alter view public.admin_users set (security_invoker = true);

-- Create policy for the view
drop policy if exists "Only admin can view users" on public.admin_users;

create policy "Only admin can view users"
  on public.admin_users
  for select
  using (
    exists (
      select 1
      from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email = 'ighildjam@gmail.com'
    )
  ); 