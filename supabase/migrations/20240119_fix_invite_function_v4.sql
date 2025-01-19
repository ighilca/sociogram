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
    new_user_id uuid;
    temp_password text;
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

    -- Generate new UUID for the user
    new_user_id := gen_random_uuid();
    temp_password := gen_random_uuid()::text;

    -- Insert into auth.users table
    insert into auth.users (
        id,
        email,
        role,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        instance_id,
        is_sso_user
    )
    values (
        new_user_id,
        user_email,
        'authenticated',
        null,
        now(),
        now(),
        jsonb_build_object('is_admin', false),
        '00000000-0000-0000-0000-000000000000',
        false
    );

    -- The handle_new_user trigger will automatically insert into public.users

    -- Return success
    return json_build_object(
        'success', true,
        'message', 'Utilisateur créé avec succès. Un email de réinitialisation de mot de passe va être envoyé.',
        'user', json_build_object('id', new_user_id)
    );
exception
    when others then
        return json_build_object(
            'success', false,
            'message', SQLERRM
        );
end;
$$; 