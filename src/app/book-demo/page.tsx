import { redirect } from "next/navigation";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

export default function BookDemo() {
  redirect(normalizeBookingUrl(siteConfig.calcom30MinUrl));
}
