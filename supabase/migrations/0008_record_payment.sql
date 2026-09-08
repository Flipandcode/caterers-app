-- ============================================================================
-- Payment recording. Payments are strictly append-only — this function only
-- ever inserts, never updates/overwrites a prior payment row, matching the
-- "payments must be transactions, not a single field" business rule.
-- ============================================================================

create or replace function record_payment(
  p_business_id uuid,
  p_order_id uuid,
  p_amount_paise bigint,
  p_payment_type payment_type,
  p_payment_method payment_method,
  p_payment_date date,
  p_reference_number text,
  p_notes text
) returns uuid as $$
declare
  v_payment_id uuid;
  v_payment_number text;
  v_current_status order_status;
begin
  if not is_business_member(p_business_id) or business_role(p_business_id) not in ('owner', 'manager') then
    raise exception 'not authorized';
  end if;

  if p_amount_paise <= 0 then
    raise exception 'amount must be positive';
  end if;

  select status into v_current_status
  from orders
  where id = p_order_id and business_id = p_business_id;

  if v_current_status is null then
    raise exception 'order not found';
  end if;

  v_payment_number := next_business_number('payment', p_business_id, extract(year from p_payment_date)::int);

  insert into payments (
    business_id, order_id, payment_number, amount_paise,
    payment_type, payment_method, payment_date, reference_number, notes, recorded_by
  ) values (
    p_business_id, p_order_id, v_payment_number, p_amount_paise,
    p_payment_type, p_payment_method, p_payment_date, p_reference_number, p_notes, auth.uid()
  )
  returning id into v_payment_id;

  -- First advance payment on a not-yet-confirmed order moves it to
  -- Confirmed, matching the default term "booking is confirmed only after
  -- receipt of advance payment." Never auto-changes cancelled/completed
  -- orders, and never downgrades a status.
  if p_payment_type = 'advance' and v_current_status in ('enquiry', 'quotation_sent', 'tentative') then
    update orders set status = 'confirmed' where id = p_order_id;
  end if;

  insert into activity_logs (business_id, order_id, actor_id, action, details)
  values (
    p_business_id, p_order_id, auth.uid(), 'payment_recorded',
    jsonb_build_object('payment_id', v_payment_id, 'amount_paise', p_amount_paise, 'payment_type', p_payment_type)
  );

  return v_payment_id;
end;
$$ language plpgsql security definer;
