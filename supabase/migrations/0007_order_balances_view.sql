-- ============================================================================
-- Per-order payment totals. A plain view (not materialized) so it always
-- reflects the live payments ledger; RLS is inherited from the underlying
-- orders/payments tables since this runs as SECURITY INVOKER (the default).
-- ============================================================================

create or replace view order_balances as
select
  o.id as order_id,
  o.business_id,
  coalesce(
    sum(case when p.payment_type = 'refund' then -p.amount_paise else p.amount_paise end),
    0
  ) as total_paid_paise
from orders o
left join payments p on p.order_id = o.id
group by o.id, o.business_id;

grant select on order_balances to authenticated;
