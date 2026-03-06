"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { getSession, signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPageCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpgradeCta, setShowUpgradeCta] = useState(false);
  const bookDemoUrl = normalizeBookingUrl(siteConfig.calcom30MinUrl);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  async function handleLogin(values: LoginValues) {
    setErrorMessage(null);
    setShowUpgradeCta(false);

    const response = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false
    });

    if (!response) {
      setErrorMessage("Unable to sign in right now. Try again.");
      return;
    }

    if (response.error) {
      if (response.error === "Configuration") {
        setErrorMessage("Login is not configured yet. Please try again shortly.");
        return;
      }
      setErrorMessage("Invalid email or password.");
      return;
    }

    const nextSession = await getSession();
    if (!nextSession?.user) {
      setErrorMessage("Unable to create login session. Try again.");
      return;
    }

    if (!nextSession.user.isPaid) {
      await signOut({ redirect: false });
      setErrorMessage("Your account is not on a paid plan yet.");
      setShowUpgradeCta(true);
      return;
    }

    const nextPath = searchParams.get("next");
    if (nextPath && nextPath.startsWith("/app")) {
      router.push(nextPath);
      return;
    }

    router.push("/app/dashboard");
  }

  return (
    <div className="w-full max-w-[440px] rounded-[22px] border border-white/10 bg-black/55 p-6 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white">Login to trai\</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Login with your email and password to access trai\
      </p>

      <form
        className="mt-6 space-y-3"
        onSubmit={loginForm.handleSubmit(async (values) => {
          await handleLogin(values);
        })}
      >
        <div className="space-y-1.5">
          <label
            htmlFor="login-email-page"
            className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
          >
            Email
          </label>
          <Input id="login-email-page" type="email" autoComplete="email" {...loginForm.register("email")} />
          <p className="text-xs text-rose-300">{loginForm.formState.errors.email?.message}</p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-password-page"
            className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
          >
            Password
          </label>
          <Input
            id="login-password-page"
            type="password"
            autoComplete="current-password"
            {...loginForm.register("password")}
          />
          <p className="text-xs text-rose-300">{loginForm.formState.errors.password?.message}</p>
        </div>

        <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
          {loginForm.formState.isSubmitting ? "Logging in..." : "Login"}
        </Button>
      </form>

      {errorMessage ? (
        <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-200">
          {errorMessage}
        </p>
      ) : null}

      {showUpgradeCta ? (
        <a href={bookDemoUrl} className="lev-button lev-button--hero-dark mt-4 w-full justify-center">
          get trai\ now
        </a>
      ) : null}
    </div>
  );
}
