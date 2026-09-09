-- ============================================================================
-- Secure public quotation sharing. A random, unguessable token per order
-- (not the order's internal UUID, which would let one link's holder try
-- adjacent orders) lets a customer view their quotation without an
-- account. The lookup function is SECURITY DEFINER and returns only
-- customer-safe fields — no business_id, no internal foreign keys.
-- ============================================================================

alter table orders add column if not exists share_token uuid unique;

create or replace function ensure_order_share_token(
  p_business_id uuid,
  p_order_id uuid
) returns uuid as $$
declare
  v_token uuid;
begin
  if not is_business_member(p_business_id) or business_role(p_business_id) not in ('owner', 'manager') then
    raise exception 'not authorized';
  end if;

  select share_token into v_token from orders where id = p_order_id and business_id = p_business_id;

  if v_token is null then
    v_token := gen_random_uuid();
    update orders set share_token = v_token where id = p_order_id;
  end if;

  return v_token;
end;
$$ language plpgsql security definer;

-- Public read: anyone with the token can view this order's safe summary.
-- Deliberately excludes internal ids, business_id, customer contact info
-- beyond name, and anything about other orders.
create or replace function get_order_by_share_token(p_token uuid)
returns table (
  order_number text,
  quotation_number text,
  event_name text,
  event_date date,
  event_start_time time,
  venue_name text,
  guest_count integer,
  food_type order_food_type,
  package_name_snapshot text,
  price_per_plate_paise bigint,
  service_charge_paise bigint,
  transport_charge_paise bigint,
  equipment_charge_paise bigint,
  staff_charge_paise bigint,
  other_charges_paise bigint,
  discount_paise bigint,
  tax_enabled boolean,
  tax_name text,
  tax_percentage numeric,
  tax_amount_paise bigint,
  grand_total_paise bigint,
  total_paid_paise bigint,
  terms_snapshot text,
  customer_name text,
  business_name text,
  business_display_name text,
  business_logo_url text,
  business_phone text,
  upi_id text,
  bank_name text,
  account_name text,
  account_number text,
  ifsc text
) as $$
  select
    o.order_number,
    o.quotation_number,
    o.event_name,
    o.event_date,
    o.event_start_time,
    o.venue_name,
    o.guest_count,
    o.food_type,
    o.package_name_snapshot,
    o.price_per_plate_paise,
    o.service_charge_paise,
    o.transport_charge_paise,
    o.equipment_charge_paise,
    o.staff_charge_paise,
    o.other_charges_paise,
    o.discount_paise,
    o.tax_enabled,
    o.tax_name,
    o.tax_percentage,
    o.tax_amount_paise,
    o.grand_total_paise,
    coalesce(ob.total_paid_paise, 0),
    o.terms_snapshot,
    c.name,
    b.name,
    b.display_name,
    b.logo_url,
    b.phone,
    bs.upi_id,
    bs.bank_name,
    bs.account_name,
    bs.account_number,
    bs.ifsc
  from orders o
  join customers c on c.id = o.customer_id
  join businesses b on b.id = o.business_id
  left join business_settings bs on bs.business_id = o.business_id
  left join order_balances ob on ob.order_id = o.id
  where o.share_token = p_token and o.is_cancelled = false;
$$ language sql security definer stable;

grant execute on function get_order_by_share_token(uuid) to anon, authenticated;

-- Companion function for the menu — validity is enforced by requiring the
-- caller to already know the token (joined through it), not by re-checking
-- authorization separately.
create or replace function get_order_menu_items_by_share_token(p_token uuid)
returns table (
  menu_item_name_snapshot text,
  category_name_snapshot text,
  food_type food_type,
  is_extra boolean,
  extra_price_paise bigint,
  extra_price_is_flat boolean,
  display_order integer
) as $$
  select
    omi.menu_item_name_snapshot,
    omi.category_name_snapshot,
    omi.food_type,
    omi.is_extra,
    omi.extra_price_paise,
    omi.extra_price_is_flat,
    omi.display_order
  from order_menu_items omi
  join orders o on o.id = omi.order_id
  where o.share_token = p_token and o.is_cancelled = false
  order by omi.display_order;
$$ language sql security definer stable;

grant execute on function get_order_menu_items_by_share_token(uuid) to anon, authenticated;
