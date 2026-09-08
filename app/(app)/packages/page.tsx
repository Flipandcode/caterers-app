import { getActiveBusinessId } from "@/lib/business-context";
import { fetchPackagesWithComposition } from "@/lib/packages-data";
import { PackagesListScreen } from "@/features/packages/components/PackagesListScreen";

export default async function PackagesPage() {
  const businessId = await getActiveBusinessId();
  const packages = await fetchPackagesWithComposition(businessId);

  return <PackagesListScreen initialPackages={packages} />;
}
