-- ============================================================================
-- Storage bucket for business logos, used in the branded header and on
-- generated PDFs. Public read (logos need to render in <img> tags and in
-- PDFs without auth), write restricted to the owning business's
-- owner/manager, uploads scoped to a per-business folder.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- Path convention: {business_id}/logo.{ext} — policies check the first
-- path segment matches a business the user manages.
create policy "Business logos are publicly readable"
on storage.objects for select
using (bucket_id = 'business-logos');

create policy "Owners can upload their business logo"
on storage.objects for insert
with check (
  bucket_id = 'business-logos'
  and business_role((storage.foldername(name))[1]::uuid) = 'owner'
);

create policy "Owners can replace their business logo"
on storage.objects for update
using (
  bucket_id = 'business-logos'
  and business_role((storage.foldername(name))[1]::uuid) = 'owner'
);

create policy "Owners can delete their business logo"
on storage.objects for delete
using (
  bucket_id = 'business-logos'
  and business_role((storage.foldername(name))[1]::uuid) = 'owner'
);
