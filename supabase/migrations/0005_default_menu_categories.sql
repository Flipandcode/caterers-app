-- ============================================================================
-- Default menu categories, per the product spec's suggested list.
-- Fixes a real onboarding gap: a brand-new business had zero categories,
-- so the "Add menu item" category dropdown had nothing to select.
-- ============================================================================

create or replace function seed_default_menu_categories(p_business_id uuid)
returns void as $$
declare
  defaults text[] := array[
    'Welcome Drink', 'Starter', 'Soup', 'Main Course', 'Sabji', 'Dal', 'Rice',
    'Roti / Bread', 'Salad', 'Papad', 'Pickle', 'Raita', 'Sweet', 'Dessert',
    'Ice Cream', 'Non-Veg Starter', 'Chicken', 'Mutton', 'Fish', 'Egg',
    'Beverage', 'Other'
  ];
  i int;
begin
  for i in 1 .. array_length(defaults, 1) loop
    if not exists (
      select 1 from menu_categories
      where business_id = p_business_id and name = defaults[i]
    ) then
      insert into menu_categories (business_id, name, display_order)
      values (p_business_id, defaults[i], i);
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Wire seeding into new business creation.
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

  return v_business_id;
end;
$$ language plpgsql security definer;

-- Backfill: give any business that currently has zero categories (like the
-- one you already created while testing) the same default set.
do $$
declare
  biz record;
begin
  for biz in select id from businesses loop
    if not exists (select 1 from menu_categories where business_id = biz.id) then
      perform seed_default_menu_categories(biz.id);
    end if;
  end loop;
end $$;
