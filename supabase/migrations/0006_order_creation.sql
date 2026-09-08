-- ============================================================================
-- Atomic order creation. Writes the order row + all its menu-item snapshot
-- rows in one transaction, and issues the human-friendly order number via
-- the existing next_business_number() sequence helper.
-- ============================================================================

create or replace function create_order(
  p_business_id uuid,
  p_customer_id uuid,
  p_event_name text,
  p_event_date date,
  p_event_start_time time,
  p_event_end_time time,
  p_venue_name text,
  p_venue_address text,
  p_guest_count integer,
  p_special_instructions text,
  p_food_type order_food_type,
  p_package_id uuid,
  p_package_name_snapshot text,
  p_price_per_plate_paise bigint,
  p_service_charge_paise bigint,
  p_transport_charge_paise bigint,
  p_equipment_charge_paise bigint,
  p_staff_charge_paise bigint,
  p_other_charges_paise bigint,
  p_discount_paise bigint,
  p_tax_enabled boolean,
  p_tax_name text,
  p_tax_percentage numeric,
  p_subtotal_paise bigint,
  p_tax_amount_paise bigint,
  p_grand_total_paise bigint,
  p_terms_snapshot text,
  p_menu_items jsonb -- [{menu_item_id, name_snapshot, category_snapshot, food_type, is_extra, extra_price_paise, extra_price_is_flat}]
) returns uuid as $$
declare
  v_order_id uuid;
  v_order_number text;
begin
  if not is_business_member(p_business_id) or business_role(p_business_id) not in ('owner', 'manager') then
    raise exception 'not authorized';
  end if;

  if p_guest_count <= 0 then
    raise exception 'guest count must be positive';
  end if;

  v_order_number := next_business_number('order', p_business_id, extract(year from p_event_date)::int);

  insert into orders (
    business_id, customer_id, order_number, event_name, event_date, event_start_time, event_end_time,
    venue_name, venue_address, guest_count, special_instructions, food_type,
    package_id, package_name_snapshot, price_per_plate_paise,
    service_charge_paise, transport_charge_paise, equipment_charge_paise, staff_charge_paise, other_charges_paise,
    discount_paise, tax_enabled, tax_name, tax_percentage,
    subtotal_paise, tax_amount_paise, grand_total_paise, terms_snapshot, created_by
  ) values (
    p_business_id, p_customer_id, v_order_number, p_event_name, p_event_date, p_event_start_time, p_event_end_time,
    p_venue_name, p_venue_address, p_guest_count, p_special_instructions, p_food_type,
    p_package_id, p_package_name_snapshot, p_price_per_plate_paise,
    p_service_charge_paise, p_transport_charge_paise, p_equipment_charge_paise, p_staff_charge_paise, p_other_charges_paise,
    p_discount_paise, p_tax_enabled, p_tax_name, p_tax_percentage,
    p_subtotal_paise, p_tax_amount_paise, p_grand_total_paise, p_terms_snapshot, auth.uid()
  )
  returning id into v_order_id;

  insert into order_menu_items (
    order_id, menu_item_id, menu_item_name_snapshot, category_name_snapshot,
    food_type, is_extra, extra_price_paise, extra_price_is_flat, display_order
  )
  select
    v_order_id,
    nullif(item->>'menu_item_id', '')::uuid,
    item->>'name_snapshot',
    item->>'category_snapshot',
    (item->>'food_type')::food_type,
    coalesce((item->>'is_extra')::boolean, false),
    coalesce((item->>'extra_price_paise')::bigint, 0),
    coalesce((item->>'extra_price_is_flat')::boolean, false),
    ord - 1
  from jsonb_array_elements(p_menu_items) with ordinality as t(item, ord);

  insert into order_preparation_tasks (order_id, label, display_order)
  values
    (v_order_id, 'Menu confirmed', 0),
    (v_order_id, 'Guest count confirmed', 1),
    (v_order_id, 'Raw material purchased', 2),
    (v_order_id, 'Kitchen preparation started', 3),
    (v_order_id, 'Staff assigned', 4),
    (v_order_id, 'Transport arranged', 5),
    (v_order_id, 'Payment follow-up completed', 6);

  insert into activity_logs (business_id, order_id, actor_id, action)
  values (p_business_id, v_order_id, auth.uid(), 'order_created');

  return v_order_id;
end;
$$ language plpgsql security definer;
