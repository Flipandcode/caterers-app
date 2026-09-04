-- ============================================================================
-- Catering SaaS — Initial Schema
-- Multi-tenant, business_id-scoped, RLS enforced.
-- Money stored as integer PAISE (₹1 = 100 paise) to avoid float errors.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type member_role as enum ('owner', 'manager', 'staff');
create type food_type as enum ('veg', 'non_veg', 'egg');
create type order_food_type as enum ('veg', 'non_veg', 'mixed');
create type order_status as enum (
  'enquiry', 'quotation_sent', 'tentative', 'confirmed',
  'preparation', 'completed', 'cancelled'
);
create type payment_type as enum ('advance', 'part_payment', 'final_payment', 'refund', 'adjustment');
create type payment_method as enum ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other');
create type document_type as enum ('quotation', 'order_confirmation', 'kitchen_sheet');
create type notification_channel as enum ('sms', 'email', 'whatsapp', 'in_app');

-- ----------------------------------------------------------------------------
-- CORE TENANCY
-- ----------------------------------------------------------------------------

-- 1:1 with auth.users, holds cross-business profile info
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text,
  owner_id uuid not null references profiles(id),
  phone text,
  whatsapp_number text,
  email text,
  logo_url text,
  address text,
  city text,
  state text,
  pin_code text,
  timezone text not null default 'Asia/Kolkata',
  onboarding_completed boolean not null default false,
  -- per-business monotonic sequences for human-friendly IDs
  quotation_seq integer not null default 0,
  order_seq integer not null default 0,
  payment_seq integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role member_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table business_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  upi_id text,
  bank_name text,
  account_name text,
  account_number text,
  ifsc text,
  qr_image_url text,
  tax_enabled boolean not null default false,
  tax_name text default 'GST',
  tax_percentage numeric(5,2) default 0,
  tax_identifier text,
  default_reminder_days integer not null default 2,
  updated_at timestamptz not null default now()
);

create table business_terms (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  body text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- MENU CATALOGUE
-- ----------------------------------------------------------------------------

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid not null references menu_categories(id),
  name text not null,
  food_type food_type not null default 'veg',
  description text,
  default_extra_price_paise bigint not null default 0,
  is_active boolean not null default true,
  is_archived boolean not null default false, -- soft delete; never hard-delete if used on an order
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PACKAGES
-- ----------------------------------------------------------------------------

create table packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  food_type order_food_type not null default 'veg',
  base_price_per_plate_paise bigint not null,
  min_guest_count integer not null default 1,
  is_active boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "Choose N from category X" rule within a package
create table package_category_rules (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references packages(id) on delete cascade,
  category_id uuid not null references menu_categories(id),
  allowed_selection_count integer not null default 1,
  display_order integer not null default 0
);

-- Fixed/preselected items always included in a package (e.g. "Jeera Rice" every time)
create table package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references packages(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  display_order integer not null default 0
);

-- ----------------------------------------------------------------------------
-- CUSTOMERS
-- ----------------------------------------------------------------------------

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text not null,
  whatsapp_number text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_customers_business_phone on customers(business_id, phone);

-- ----------------------------------------------------------------------------
-- ORDERS  (with historical snapshots — critical business rule)
-- ----------------------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id),
  order_number text not null,          -- e.g. ORD-2026-0001

  event_name text not null,
  event_date date not null,
  event_start_time time,
  event_end_time time,
  venue_name text,
  venue_address text,
  guest_count integer not null check (guest_count > 0),
  special_instructions text,

  food_type order_food_type not null default 'veg',

  package_id uuid references packages(id),          -- null if fully custom
  package_name_snapshot text,                        -- frozen at order time
  price_per_plate_paise bigint not null,              -- frozen at order time

  service_charge_paise bigint not null default 0,
  transport_charge_paise bigint not null default 0,
  equipment_charge_paise bigint not null default 0,
  staff_charge_paise bigint not null default 0,
  other_charges_paise bigint not null default 0,
  discount_paise bigint not null default 0,

  tax_enabled boolean not null default false,
  tax_name text,
  tax_percentage numeric(5,2) default 0,

  subtotal_paise bigint not null default 0,   -- computed, stored for snapshot integrity
  tax_amount_paise bigint not null default 0,
  grand_total_paise bigint not null default 0,

  terms_snapshot text,                        -- frozen copy of terms text at time of quote
  status order_status not null default 'enquiry',

  is_cancelled boolean not null default false,
  cancelled_at timestamptz,

  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (business_id, order_number)
);
create index idx_orders_business_date on orders(business_id, event_date);
create index idx_orders_business_status on orders(business_id, status);
create index idx_orders_customer on orders(customer_id);

-- Line items actually selected for THIS order (menu item name/price frozen)
create table order_menu_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),   -- nullable: source item may later be archived
  menu_item_name_snapshot text not null,
  category_name_snapshot text not null,
  food_type food_type not null,
  is_extra boolean not null default false,        -- beyond package allowance
  extra_price_paise bigint not null default 0,    -- per-plate or flat, see extra_price_is_flat
  extra_price_is_flat boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_order_menu_items_order on order_menu_items(order_id);

-- Named extra charges beyond the standard charge fields (kept generic/extensible)
create table order_charges (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  label text not null,
  amount_paise bigint not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PAYMENTS (append-only ledger — never overwrite "amount paid")
-- ----------------------------------------------------------------------------

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  payment_number text not null,          -- e.g. PAY-2026-0001
  amount_paise bigint not null,          -- positive; refunds/adjustments recorded via payment_type + sign convention documented in app layer
  payment_type payment_type not null,
  payment_method payment_method not null,
  payment_date date not null default current_date,
  reference_number text,
  notes text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (business_id, payment_number)
);
create index idx_payments_order on payments(order_id);

-- ----------------------------------------------------------------------------
-- PREPARATION / KITCHEN
-- ----------------------------------------------------------------------------

create table order_preparation_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  label text not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  display_order integer not null default 0
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------

create table notification_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  sms_enabled boolean not null default false,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  reminder_days_before integer not null default 2
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  channel notification_channel not null,
  event_key text not null,   -- idempotency key, e.g. 'order:{id}:reminder:2d'
  payload jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, event_key, channel)
);

-- ----------------------------------------------------------------------------
-- DOCUMENTS (PDF versioning)
-- ----------------------------------------------------------------------------

create table documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  document_type document_type not null,
  version integer not null default 1,
  storage_path text not null,   -- e.g. {business_id}/orders/{order_id}/quotation-v2.pdf
  generated_by uuid references profiles(id),
  share_token text unique,      -- for /q/{token} public view
  created_at timestamptz not null default now()
);
create index idx_documents_order on documents(order_id);

-- ----------------------------------------------------------------------------
-- ACTIVITY LOG
-- ----------------------------------------------------------------------------

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,       -- e.g. 'order_created', 'payment_recorded', 'status_changed'
  details jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_business_order on activity_logs(business_id, order_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_businesses_updated_at before update on businesses for each row execute function set_updated_at();
create trigger trg_customers_updated_at before update on customers for each row execute function set_updated_at();
create trigger trg_menu_items_updated_at before update on menu_items for each row execute function set_updated_at();
create trigger trg_packages_updated_at before update on packages for each row execute function set_updated_at();
create trigger trg_orders_updated_at before update on orders for each row execute function set_updated_at();
create trigger trg_terms_updated_at before update on business_terms for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Sequence generator helper (per-business, per-year, atomic via row lock)
-- Usage: select next_business_number('order', business_id, 2026);
-- ----------------------------------------------------------------------------
create or replace function next_business_number(kind text, biz_id uuid, yr int)
returns text as $$
declare
  n int;
  prefix text;
  col text;
begin
  if kind = 'order' then prefix := 'ORD'; col := 'order_seq';
  elsif kind = 'quotation' then prefix := 'QT'; col := 'quotation_seq';
  elsif kind = 'payment' then prefix := 'PAY'; col := 'payment_seq';
  else raise exception 'unknown kind %', kind;
  end if;

  execute format('update businesses set %I = %I + 1 where id = $1 returning %I', col, col, col)
    into n using biz_id;

  return format('%s-%s-%s', prefix, yr, lpad(n::text, 4, '0'));
end;
$$ language plpgsql security definer;
