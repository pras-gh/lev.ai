import { redirect } from "next/navigation";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

export default function ProductEntryPage() {
  redirect(normalizeBookingUrl(siteConfig.productAppUrl));
}
