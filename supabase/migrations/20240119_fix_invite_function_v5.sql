-- Drop existing function
drop function if exists public.invite_user(user_email text);

-- Create updated function
create or replace function public.invite_user(user_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    result json;
begin
    -- Verify if the caller is an admin
    if not exists (
        select 1
        from auth.users
        where auth.users.id = auth.uid()
        and auth.users.email = 'ighildjam@gmail.com'
    ) then
        return json_build_object(
            'success', false,
            'message', 'Seul l''administrateur peut inviter des utilisateurs'
        );
    end if;

    -- Check if user already exists
    if exists (select 1 from auth.users where email = user_email) then
        return json_build_object(
            'success', false,
            'message', 'Un utilisateur avec cet email existe déjà'
        );
    end if;

    -- Use Supabase's native invitation system
    select auth.invite_user(
        user_email,
        'authenticated',
        jsonb_build_object('is_admin', false)
    ) into result;

    -- Return success
    return json_build_object(
        'success', true,
        'message', 'Email d''invitation envoyé avec succès',
        'user', result
    );
exception
    when others then
        return json_build_object(
            'success', false,
            'message', SQLERRM
        );
end;
$$; 