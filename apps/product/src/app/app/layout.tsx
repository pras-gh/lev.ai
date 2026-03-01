import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/components/product/query-provider";
import { authOptions } from "@/lib/auth/options";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isPaid) {
    redirect(normalizeBookingUrl(siteConfig.calcom30MinUrl));
  }

  return <QueryProvider>{children}</QueryProvider>;
}
