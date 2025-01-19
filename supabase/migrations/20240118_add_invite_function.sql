-- Get exact schema and function details
SELECT n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as function_arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'invite_user';

-- Drop function with exact schema
DO $$
BEGIN
    DROP FUNCTION IF EXISTS auth.invite_user(text);
    DROP FUNCTION IF EXISTS public.invite_user(text);
    DROP FUNCTION IF EXISTS supabase_auth.invite_user(text);
    DROP FUNCTION IF EXISTS supabase.invite_user(text);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping function: %', SQLERRM;
END $$;

-- Drop existing function from public schema
drop function if exists public.invite_user(user_email text);

-- Function to invite a new user
create or replace function public.invite_user(user_email text)
returns json
language plpgsql
security definer
set search_path to 'public'
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

    -- Insert into auth.users table
    insert into auth.users (
        email,
        role,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        confirmation_sent_at
    )
    values (
        user_email,
        'authenticated',
        null, -- Ne pas confirmer l'email immédiatement
        now(),
        now(),
        jsonb_build_object('is_admin', false),
        now()
    )
    returning id into result;

    -- Send invitation email
    perform auth.send_invite_email(user_email);

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