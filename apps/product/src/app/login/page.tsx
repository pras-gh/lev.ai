import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginPageCard } from "@/components/auth/login-page-card";
import { authOptions } from "@/lib/auth/options";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.isPaid) {
    redirect("/app/dashboard");
  }

  if (session?.user && !session.user.isPaid) {
    redirect(normalizeBookingUrl(siteConfig.calcom30MinUrl));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050608] px-6 py-12 text-white sm:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,234,100,0.09),transparent_30%),radial-gradient(circle_at_78%_20%,rgba(0,234,100,0.07),transparent_34%),linear-gradient(180deg,#040506_0%,#050608_52%,#040506_100%)]" />
      </div>

      <section className="relative mx-auto flex min-h-[80vh] w-full max-w-6xl items-center justify-center">
        <LoginPageCard />
      </section>
    </main>
  );
}
