-- ============================================================================
-- Order lifecycle: status transitions, cancellation, preparation checklist.
-- Every status change and cancellation is logged to activity_logs so the
-- order detail page can show a real timeline, not just the current state.
-- ============================================================================

create or replace function update_order_status(
  p_business_id uuid,
  p_order_id uuid,
  p_new_status order_status
) returns void as $$
declare
  v_old_status order_status;
  v_is_cancelled boolean;
begin
  if not is_business_member(p_business_id) or business_role(p_business_id) not in ('owner', 'manager') then
    raise exception 'not authorized';
  end if;

  select status, is_cancelled into v_old_status, v_is_cancelled
  from orders where id = p_order_id and business_id = p_business_id;

  if v_old_status is null then
    raise exception 'order not found';
  end if;

  if v_is_cancelled then
    raise exception 'cannot change status of a cancelled order';
  end if;

  if v_old_status = p_new_status then
    return; -- no-op, nothing to log
  end if;

  -- Cancelling goes through cancel_order() instead, so it also sets
  -- is_cancelled/cancelled_at consistently in one place.
  if p_new_status = 'cancelled' then
    raise exception 'use cancel_order() to cancel an order';
  end if;

  update orders set status = p_new_status where id = p_order_id;

  insert into activity_logs (business_id, order_id, actor_id, action, details)
  values (
    p_business_id, p_order_id, auth.uid(), 'status_changed',
    jsonb_build_object('from', v_old_status, 'to', p_new_status)
  );
end;
$$ language plpgsql security definer;

create or replace function cancel_order(
  p_business_id uuid,
  p_order_id uuid
) returns void as $$
declare
  v_old_status order_status;
begin
  if not is_business_member(p_business_id) or business_role(p_business_id) not in ('owner', 'manager') then
    raise exception 'not authorized';
  end if;

  select status into v_old_status from orders where id = p_order_id and business_id = p_business_id;

  if v_old_status is null then
    raise exception 'order not found';
  end if;

  if v_old_status = 'cancelled' then
    return; -- already cancelled, no-op
  end if;

  update orders
  set status = 'cancelled', is_cancelled = true, cancelled_at = now()
  where id = p_order_id;

  insert into activity_logs (business_id, order_id, actor_id, action, details)
  values (p_business_id, p_order_id, auth.uid(), 'order_cancelled', jsonb_build_object('from', v_old_status));
end;
$$ language plpgsql security definer;

-- Any active business member (owner, manager, or staff) can tick off
-- preparation/kitchen tasks — this is explicitly staff-accessible per spec,
-- unlike pricing/payments which stay owner/manager-only.
create or replace function toggle_preparation_task(
  p_task_id uuid,
  p_is_completed boolean
) returns void as $$
declare
  v_business_id uuid;
begin
  select o.business_id into v_business_id
  from order_preparation_tasks t
  join orders o on o.id = t.order_id
  where t.id = p_task_id;

  if v_business_id is null or not is_business_member(v_business_id) then
    raise exception 'not authorized';
  end if;

  update order_preparation_tasks
  set is_completed = p_is_completed,
      completed_at = case when p_is_completed then now() else null end
  where id = p_task_id;
end;
$$ language plpgsql security definer;
