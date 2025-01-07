-- Drop existing function and view if they exist
drop function if exists public.get_users();
drop view if exists public.admin_users;

-- Create users table
create table if not exists public.users (
  id uuid references auth.users on delete cascade,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_sign_in_at timestamp with time zone,
  disabled boolean default false,
  primary key (id)
);

-- Enable RLS
alter table public.users enable row level security;

-- Create policies
create policy "Users can view their own user data" on users for select
  using (auth.uid() = id);

create policy "Only admin can manage users" on users for all
  using (
    exists (
      select 1
      from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email = 'ighildjam@gmail.com'
    )
  );

-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, created_at)
  values (new.id, new.email, new.created_at);
  return new;
end;
$$;

-- Create trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create view for users
create or replace view public.admin_users as
select 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  not coalesce(u.disabled, false) as is_active
from auth.users au
left join public.users u on u.id = au.id
order by au.created_at desc;

-- Enable RLS on the view
alter view public.admin_users set (security_invoker = true);

-- Create policy for the view
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