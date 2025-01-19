-- Create function to delete user
create or replace function public.delete_user(user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
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
            'message', 'Seul l''administrateur peut supprimer des utilisateurs'
        );
    end if;

    -- Delete from public.users first (this will cascade to other tables)
    delete from public.users where id = user_id;

    -- Delete from auth.users
    delete from auth.users where id = user_id;

    -- Return success
    return json_build_object(
        'success', true,
        'message', 'Utilisateur supprimé avec succès'
    );
exception
    when others then
        return json_build_object(
            'success', false,
            'message', SQLERRM
        );
end;
$$; 