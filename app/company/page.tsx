import { CompanyProfile } from "@/components/CompanyProfile";
import { sharedUsage } from "@/lib/assess";
import { CURATED } from "@/lib/curated";

export const metadata = { title: "Your company profile | OAuth Ready" };

export default function CompanyPage() {
  return <CompanyProfile guides={CURATED} usage={Object.fromEntries(sharedUsage(CURATED))} />;
}
