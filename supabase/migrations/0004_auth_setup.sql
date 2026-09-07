-- ============================================================================
-- Auth wiring: auto-create a profile row when someone signs up, and an
-- atomic "create business + make me its owner" function for onboarding.
-- ============================================================================

-- Auto-create profiles row whenever a new auth.users row appears.
-- SECURITY DEFINER: runs as the function owner, bypassing RLS, because at
-- the moment this fires there's no established session for auth.uid() to
-- match against yet.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Onboarding: create a business and make the calling user its owner, plus
-- default settings rows, in one atomic call. SECURITY DEFINER because the
-- very first business_members row for a new business can't satisfy the
-- normal "must already be an owner" RLS check — owner_id is taken from
-- auth.uid() inside the function, never from a client-supplied argument,
-- so a caller cannot make themselves owner of an arbitrary business.
create or replace function create_business_with_owner(
  p_name text,
  p_phone text,
  p_whatsapp text,
  p_email text
) returns uuid as $$
declare
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into businesses (name, owner_id, phone, whatsapp_number, email)
  values (p_name, auth.uid(), p_phone, p_whatsapp, p_email)
  returning id into v_business_id;

  insert into business_members (business_id, user_id, role, is_active)
  values (v_business_id, auth.uid(), 'owner', true);

  insert into business_settings (business_id) values (v_business_id);
  insert into notification_settings (business_id) values (v_business_id);

  return v_business_id;
end;
$$ language plpgsql security definer;
