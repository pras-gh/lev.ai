"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;
type AuthResult = "ok" | "restricted" | "error";
type PlanStatus = "trial" | "active" | "overdue" | "cancelled";

type LoginModalProps = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

function restrictedMessage(planStatus: PlanStatus) {
  if (planStatus === "overdue") {
    return "Your account is overdue. Book a demo to restore access.";
  }

  if (planStatus === "cancelled") {
    return "Your account is cancelled. Book a demo to reactivate access.";
  }

  return "This email is not approved yet. Book a demo for early access.";
}

function normalizePlanStatus(value: unknown): PlanStatus {
  if (value === "active" || value === "overdue" || value === "cancelled" || value === "trial") {
    return value;
  }
  return "trial";
}

export function LoginModal({ triggerClassName, onTriggerClick }: LoginModalProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEarlyAccessCta, setShowEarlyAccessCta] = useState(false);
  const bookDemoUrl = normalizeBookingUrl(siteConfig.calcom30MinUrl);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isSignedIn = Boolean(session?.user);
  const triggerLabel = status === "loading" ? "Client Access" : isSignedIn ? "Account" : "Client Access";

  async function signInAndRedirect(email: string, password: string): Promise<AuthResult> {
    setShowEarlyAccessCta(false);
    setErrorMessage(null);

    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!response) {
      setErrorMessage("Unable to sign in right now. Try again.");
      return "error";
    }

    if (response.error) {
      if (response.error === "Configuration") {
        setErrorMessage("Login is not configured yet. Please try again shortly.");
        return "error";
      }
      setErrorMessage("Invalid email or password.");
      return "error";
    }

    const nextSession = await getSession();
    if (!nextSession?.user) {
      setErrorMessage("Unable to create login session. Try again.");
      return "error";
    }

    const planStatus = normalizePlanStatus(nextSession.user.planStatus);
    if (planStatus !== "active") {
      await signOut({ redirect: false });
      setShowEarlyAccessCta(true);
      setErrorMessage(restrictedMessage(planStatus));
      return "restricted";
    }

    const nextPath =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const targetPath = nextPath && nextPath.startsWith("/app") ? nextPath : "/app/dashboard";

    loginForm.reset();
    setOpen(false);
    router.push(targetPath);
    return "ok";
  }

  async function handleSignOut() {
    await signOut({ redirect: false });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setErrorMessage(null);
          setShowEarlyAccessCta(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={() => {
            onTriggerClick?.();
          }}
          className={cn("lev-button lev-button--outline", triggerClassName)}
        >
          {triggerLabel}
        </button>
      </DialogTrigger>

      <DialogContent className="lev-login-box-glow sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isSignedIn ? "Account" : "Login to trai\\"}</DialogTitle>
          <DialogDescription>
            {isSignedIn
              ? "You already have product access."
              : "Use your approved email and password to access the product dashboard."}
          </DialogDescription>
        </DialogHeader>

        {isSignedIn ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">Signed in as</p>
            <p className="text-sm font-semibold text-white">{session?.user?.email ?? "Unknown user"}</p>
            <div className="flex items-center gap-2">
              <Link href="/app/dashboard" className="lev-button lev-button--hero-dark">
                Open Product
              </Link>
              <Button variant="outline" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={loginForm.handleSubmit(async (values) => {
              await signInAndRedirect(values.email, values.password);
            })}
          >
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300">
                Email
              </label>
              <Input id="login-email" type="email" autoComplete="email" {...loginForm.register("email")} />
              <p className="text-xs text-rose-300">{loginForm.formState.errors.email?.message}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300">
                Password
              </label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                {...loginForm.register("password")}
              />
              <p className="text-xs text-rose-300">{loginForm.formState.errors.password?.message}</p>
            </div>

            <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting ? "Signing in..." : "User Sign In"}
            </Button>
          </form>
        )}

        {errorMessage ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</p>
        ) : null}

        {!isSignedIn && showEarlyAccessCta ? (
          <a href={bookDemoUrl} className="lev-button lev-button--hero-dark w-full justify-center">
            Book demo for early access
          </a>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
