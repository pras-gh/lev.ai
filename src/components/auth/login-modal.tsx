"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

type LoginModalProps = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

export function LoginModal({ triggerClassName, onTriggerClick }: LoginModalProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpgradeCta, setShowUpgradeCta] = useState(false);
  const bookDemoUrl = normalizeBookingUrl(siteConfig.calcom30MinUrl);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isSignedIn = Boolean(session?.user);
  const triggerLabel = status === "loading" ? "Login" : isSignedIn ? "Account" : "Login";

  async function handleLogin(values: LoginValues) {
    setErrorMessage(null);
    setShowUpgradeCta(false);

    const response = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
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

    if (!nextSession?.user?.isPaid) {
      await signOut({ redirect: false });
      setErrorMessage("Your account is not on a paid plan yet.");
      setShowUpgradeCta(true);
      return;
    }

    loginForm.reset();
    setOpen(false);
    router.push("/dashboard");
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
          setShowUpgradeCta(false);
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

      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isSignedIn ? "Account" : "Login to trai\\"}</DialogTitle>
          <DialogDescription>
            {isSignedIn
              ? "You already have dashboard access."
              : "Login with your email and password to access product dashboard."}
          </DialogDescription>
        </DialogHeader>

        {isSignedIn ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">Signed in as</p>
            <p className="text-sm font-semibold text-white">{session?.user?.email ?? "Unknown user"}</p>
            <Button variant="outline" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={loginForm.handleSubmit(async (values) => {
              await handleLogin(values);
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
              {loginForm.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>
        )}

        {errorMessage ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</p>
        ) : null}

        {!isSignedIn && showUpgradeCta ? (
          <a href={bookDemoUrl} className="lev-button lev-button--hero-dark w-full justify-center">
            get trai\ now
          </a>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
