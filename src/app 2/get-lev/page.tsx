import { redirect } from "next/navigation";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

export default function GetLevPage() {
  redirect(normalizeBookingUrl(siteConfig.calcom30MinUrl));
}
