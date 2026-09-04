-- ============================================================================
-- Atomic package composition writes.
-- A package's rules + preselected items are always replaced as a set on
-- save, inside one transaction, so a client never sees or persists a
-- half-written package (e.g. rules saved but preselected items failed).
-- ============================================================================

create or replace function save_package_with_composition(
  p_package_id uuid,
  p_business_id uuid,
  p_name text,
  p_description text,
  p_food_type order_food_type,
  p_base_price_per_plate_paise bigint,
  p_min_guest_count integer,
  p_category_rules jsonb,   -- [{category_id, allowed_selection_count}]
  p_preselected_items jsonb -- [{menu_item_id}]
) returns uuid as $$
declare
  v_package_id uuid;
begin
  if not is_business_member(p_business_id) or business_role(p_business_id) not in ('owner','manager') then
    raise exception 'not authorized';
  end if;

  if p_package_id is null then
    insert into packages (business_id, name, description, food_type, base_price_per_plate_paise, min_guest_count)
    values (p_business_id, p_name, p_description, p_food_type, p_base_price_per_plate_paise, p_min_guest_count)
    returning id into v_package_id;
  else
    update packages set
      name = p_name,
      description = p_description,
      food_type = p_food_type,
      base_price_per_plate_paise = p_base_price_per_plate_paise,
      min_guest_count = p_min_guest_count
    where id = p_package_id and business_id = p_business_id
    returning id into v_package_id;

    if v_package_id is null then
      raise exception 'package not found';
    end if;

    delete from package_category_rules where package_id = v_package_id;
    delete from package_items where package_id = v_package_id;
  end if;

  insert into package_category_rules (package_id, category_id, allowed_selection_count, display_order)
  select v_package_id, (r->>'category_id')::uuid, (r->>'allowed_selection_count')::integer, ord - 1
  from jsonb_array_elements(p_category_rules) with ordinality as t(r, ord);

  insert into package_items (package_id, menu_item_id, display_order)
  select v_package_id, (i->>'menu_item_id')::uuid, ord - 1
  from jsonb_array_elements(p_preselected_items) with ordinality as t(i, ord);

  return v_package_id;
end;
$$ language plpgsql security definer;

create or replace function duplicate_package(p_package_id uuid)
returns uuid as $$
declare
  v_new_id uuid;
  v_business_id uuid;
begin
  select business_id into v_business_id from packages where id = p_package_id;
  if v_business_id is null or not is_business_member(v_business_id)
     or business_role(v_business_id) not in ('owner','manager') then
    raise exception 'not authorized';
  end if;

  insert into packages (business_id, name, description, food_type, base_price_per_plate_paise, min_guest_count, is_active)
  select business_id, name || ' (Copy)', description, food_type, base_price_per_plate_paise, min_guest_count, is_active
  from packages where id = p_package_id
  returning id into v_new_id;

  insert into package_category_rules (package_id, category_id, allowed_selection_count, display_order)
  select v_new_id, category_id, allowed_selection_count, display_order
  from package_category_rules where package_id = p_package_id;

  insert into package_items (package_id, menu_item_id, display_order)
  select v_new_id, menu_item_id, display_order
  from package_items where package_id = p_package_id;

  return v_new_id;
end;
$$ language plpgsql security definer;
