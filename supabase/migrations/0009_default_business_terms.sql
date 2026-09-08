-- ============================================================================
-- Default terms & conditions, per the spec's example list. Caterers can
-- edit these later (Settings > Default Terms, not yet built) — seeding
-- sensible defaults now means every order has a real terms snapshot
-- instead of a blank PDF section.
-- ============================================================================

create or replace function seed_default_business_terms(p_business_id uuid)
returns void as $$
declare
  defaults text[][] := array[
    array['Booking Confirmation', 'Booking will be confirmed only after receipt of advance payment.'],
    array['Guest Count', 'Final guest count must be confirmed before the agreed cutoff date.'],
    array['Final Payment', 'Full payment must be completed at least 5 days before the function.'],
    array['Additional Guests', 'Additional guests will be charged according to the agreed per-plate rate.'],
    array['Menu Changes', 'Any additional menu item requested after order confirmation may incur additional charges.'],
    array['Cancellation', 'Cancellation charges may apply according to the cancellation date.'],
    array['Venue Requirements', 'Customer must ensure suitable venue access, electricity and water where required.'],
    array['Pricing Basis', 'Prices are based on the selected menu and confirmed guest count.']
  ];
  i int;
begin
  for i in 1 .. array_length(defaults, 1) loop
    if not exists (
      select 1 from business_terms
      where business_id = p_business_id and title = defaults[i][1]
    ) then
      insert into business_terms (business_id, title, body, display_order)
      values (p_business_id, defaults[i][1], defaults[i][2], i);
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Wire into new business creation, alongside the existing default categories.
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

  perform seed_default_menu_categories(v_business_id);
  perform seed_default_business_terms(v_business_id);

  return v_business_id;
end;
$$ language plpgsql security definer;

-- Backfill: give any business with zero terms rows (including the one you
-- already created while testing) the same default set.
do $$
declare
  biz record;
begin
  for biz in select id from businesses loop
    if not exists (select 1 from business_terms where business_id = biz.id) then
      perform seed_default_business_terms(biz.id);
    end if;
  end loop;
end $$;
