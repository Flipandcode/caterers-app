-- ============================================================================
-- Quotation numbering + document versioning.
-- A quotation number (QT-2026-0001) is assigned once per order, on first
-- generation, and reused across revisions — only the version increments.
-- Matches the spec: "Quotation V1, V2, V3 ... do not destroy older
-- generated quotations."
-- ============================================================================

alter table orders add column if not exists quotation_number text;

create or replace function record_document_generation(
  p_business_id uuid,
  p_order_id uuid,
  p_document_type document_type
) returns table (quotation_number text, version integer) as $$
declare
  v_quotation_number text;
  v_next_version integer;
begin
  if not is_business_member(p_business_id) then
    raise exception 'not authorized';
  end if;

  if p_document_type = 'quotation' or p_document_type = 'order_confirmation' then
    select o.quotation_number into v_quotation_number from orders o where o.id = p_order_id;

    if v_quotation_number is null then
      v_quotation_number := next_business_number(
        'quotation', p_business_id,
        extract(year from (select event_date from orders where id = p_order_id))::int
      );
      update orders set quotation_number = v_quotation_number where id = p_order_id;
    end if;
  end if;

  select coalesce(max(d.version), 0) + 1 into v_next_version
  from documents d
  where d.order_id = p_order_id and d.document_type = p_document_type;

  insert into documents (business_id, order_id, document_type, version, storage_path, generated_by)
  values (
    p_business_id, p_order_id, p_document_type, v_next_version,
    format('%s/orders/%s/%s-v%s.pdf', p_business_id, p_order_id, p_document_type, v_next_version),
    auth.uid()
  );

  insert into activity_logs (business_id, order_id, actor_id, action, details)
  values (
    p_business_id, p_order_id, auth.uid(), 'quotation_generated',
    jsonb_build_object('document_type', p_document_type, 'version', v_next_version)
  );

  return query select v_quotation_number, v_next_version;
end;
$$ language plpgsql security definer;
