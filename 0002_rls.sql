-- ============================================================================
-- Row Level Security
-- Rule: a user may access a row only if they are an active member of the
-- business that row belongs to. Owner/manager/staff scoping (e.g. hiding
-- financials from staff) is enforced at the API/server layer on top of this,
-- since RLS here establishes tenant isolation as the hard boundary.
-- ============================================================================

create or replace function is_business_member(biz_id uuid)
returns boolean as $$
  select exists (
    select 1 from business_members bm
    where bm.business_id = biz_id
      and bm.user_id = auth.uid()
      and bm.is_active = true
  );
$$ language sql security definer stable;

create or replace function business_role(biz_id uuid)
returns member_role as $$
  select bm.role from business_members bm
  where bm.business_id = biz_id
    and bm.user_id = auth.uid()
    and bm.is_active = true
  limit 1;
$$ language sql security definer stable;

-- profiles: user can see/edit only their own profile
alter table profiles enable row level security;
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- businesses: visible to members; only owner can update core record
alter table businesses enable row level security;
create policy businesses_select on businesses
  for select using (is_business_member(id));
create policy businesses_insert on businesses
  for insert with check (owner_id = auth.uid());
create policy businesses_update on businesses
  for update using (business_role(id) = 'owner');

alter table business_members enable row level security;
create policy business_members_select on business_members
  for select using (is_business_member(business_id));
create policy business_members_manage on business_members
  for all using (business_role(business_id) = 'owner')
  with check (business_role(business_id) = 'owner');

-- Generic pattern applied to every tenant-scoped table below:
--   SELECT/INSERT/UPDATE/DELETE gated on is_business_member(business_id)
-- Financial tables (payments, orders' pricing) are further restricted so
-- 'staff' role cannot read amounts — handled via a view in the app layer;
-- base tables here only enforce tenant isolation.

alter table business_settings enable row level security;
create policy business_settings_rw on business_settings
  for all using (is_business_member(business_id)) with check (business_role(business_id) in ('owner','manager'));

alter table business_terms enable row level security;
create policy business_terms_select on business_terms for select using (is_business_member(business_id));
create policy business_terms_write on business_terms for all
  using (business_role(business_id) in ('owner','manager'))
  with check (business_role(business_id) in ('owner','manager'));

alter table menu_categories enable row level security;
create policy menu_categories_rw on menu_categories for all
  using (is_business_member(business_id)) with check (business_role(business_id) in ('owner','manager'));

alter table menu_items enable row level security;
create policy menu_items_select on menu_items for select using (is_business_member(business_id));
create policy menu_items_write on menu_items for all
  using (business_role(business_id) in ('owner','manager'))
  with check (business_role(business_id) in ('owner','manager'));

alter table packages enable row level security;
create policy packages_select on packages for select using (is_business_member(business_id));
create policy packages_write on packages for all
  using (business_role(business_id) in ('owner','manager'))
  with check (business_role(business_id) in ('owner','manager'));

alter table package_category_rules enable row level security;
create policy pkg_rules_rw on package_category_rules for all using (
  exists (select 1 from packages p where p.id = package_id and is_business_member(p.business_id))
);

alter table package_items enable row level security;
create policy pkg_items_rw on package_items for all using (
  exists (select 1 from packages p where p.id = package_id and is_business_member(p.business_id))
);

alter table customers enable row level security;
create policy customers_rw on customers for all
  using (is_business_member(business_id)) with check (is_business_member(business_id));

alter table orders enable row level security;
create policy orders_select on orders for select using (is_business_member(business_id));
create policy orders_write on orders for all
  using (business_role(business_id) in ('owner','manager'))
  with check (business_role(business_id) in ('owner','manager'));

alter table order_menu_items enable row level security;
create policy order_menu_items_rw on order_menu_items for all using (
  exists (select 1 from orders o where o.id = order_id and is_business_member(o.business_id))
);

alter table order_charges enable row level security;
create policy order_charges_rw on order_charges for all using (
  exists (select 1 from orders o where o.id = order_id and is_business_member(o.business_id))
);

alter table payments enable row level security;
create policy payments_select on payments for select using (
  business_role(business_id) in ('owner','manager')
);
create policy payments_write on payments for all
  using (business_role(business_id) in ('owner','manager'))
  with check (business_role(business_id) in ('owner','manager'));

alter table order_preparation_tasks enable row level security;
create policy prep_tasks_rw on order_preparation_tasks for all using (
  exists (select 1 from orders o where o.id = order_id and is_business_member(o.business_id))
);

alter table notification_settings enable row level security;
create policy notif_settings_rw on notification_settings for all
  using (business_role(business_id) = 'owner') with check (business_role(business_id) = 'owner');

alter table notifications enable row level security;
create policy notifications_select on notifications for select using (is_business_member(business_id));

alter table documents enable row level security;
create policy documents_rw on documents for all using (is_business_member(business_id));

alter table activity_logs enable row level security;
create policy activity_logs_select on activity_logs for select using (is_business_member(business_id));
create policy activity_logs_insert on activity_logs for insert with check (is_business_member(business_id));
