-- Drop existing function
drop function if exists public.invite_user(user_email text);

-- Create updated function
create or replace function public.invite_user(user_email text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
    new_user_id uuid;
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

    -- Insert into auth.users table
    insert into auth.users (
        id,
        email,
        role,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        confirmation_sent_at
    )
    values (
        new_user_id,
        user_email,
        'authenticated',
        null, -- Ne pas confirmer l'email immédiatement
        now(),
        now(),
        jsonb_build_object('is_admin', false),
        now()
    );

    -- Insert into public.users table
    insert into public.users (
        id,
        email,
        created_at
    )
    values (
        new_user_id,
        user_email,
        now()
    );

    -- Send invitation email
    perform auth.send_invite_email(user_email);

    -- Return success
    return json_build_object(
        'success', true,
        'message', 'Email d''invitation envoyé avec succès',
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