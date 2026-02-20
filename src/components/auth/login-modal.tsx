"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const emailPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const magicLinkSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type EmailPasswordValues = z.infer<typeof emailPasswordSchema>;
type MagicLinkValues = z.infer<typeof magicLinkSchema>;

type SessionResponse = {
  authenticated: boolean;
  user: {
    id: string;
    email: string | null;
  } | null;
};

type LoginModalProps = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

export function LoginModal({ triggerClassName, onTriggerClick }: LoginModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  const supabaseEnabled = hasSupabasePublicEnv();

  const emailPasswordForm = useForm<EmailPasswordValues>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { email: "", password: "" },
  });

  const magicLinkForm = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  const clearNotices = useCallback(() => {
    setStatusMessage(null);
    setErrorMessage(null);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabaseEnabled) {
      setSignedInEmail(null);
      setIsCheckingSession(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as SessionResponse;

      if (response.ok && data.authenticated) {
        setSignedInEmail(data.user?.email ?? null);
      } else {
        setSignedInEmail(null);
      }
    } catch {
      setSignedInEmail(null);
    } finally {
      setIsCheckingSession(false);
    }
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!supabaseEnabled) {
      return;
    }

    try {
      setSupabase(createSupabaseBrowserClient());
    } catch {
      setErrorMessage("Supabase URL is invalid. Check NEXT_PUBLIC_SUPABASE_URL.");
    }
  }, [supabaseEnabled]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession, supabase]);

  async function handlePasswordSignIn(values: EmailPasswordValues) {
    if (!supabase) {
      setErrorMessage("Supabase is not configured yet. Add env vars and retry.");
      return;
    }

    clearNotices();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage("Signed in successfully.");
    setOpen(false);
    emailPasswordForm.reset({ email: values.email, password: "" });
    await refreshSession();
  }

  async function handleMagicLink(values: MagicLinkValues) {
    if (!supabase) {
      setErrorMessage("Supabase is not configured yet. Add env vars and retry.");
      return;
    }

    clearNotices();
    const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage("Magic link sent. Check your inbox.");
    magicLinkForm.reset({ email: values.email });
  }

  async function handleGoogleSignIn() {
    if (!supabase) {
      setErrorMessage("Supabase is not configured yet. Add env vars and retry.");
      return;
    }

    clearNotices();
    setIsGoogleLoading(true);

    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsGoogleLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    clearNotices();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage("Signed out.");
    setSignedInEmail(null);
    await refreshSession();
  }

  const triggerLabel = isCheckingSession ? "Login" : signedInEmail ? "Account" : "Login";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          clearNotices();
          void refreshSession();
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
          <DialogTitle>Login to trai\</DialogTitle>
          <DialogDescription>
            Access your account with email, magic link, or Google.
          </DialogDescription>
        </DialogHeader>

        {!supabaseEnabled ? (
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            Add <code className="font-semibold">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable login.
          </div>
        ) : null}

        {signedInEmail ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">Signed in as</p>
            <p className="text-sm font-semibold text-white">{signedInEmail}</p>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                void handleGoogleSignIn();
              }}
              disabled={!supabaseEnabled || isGoogleLoading}
            >
              {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
            </Button>

            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-white/12" />
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">or</span>
              <span className="h-px flex-1 bg-white/12" />
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <Button
                variant={mode === "password" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("password")}
              >
                Email + Password
              </Button>
              <Button
                variant={mode === "magic" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("magic")}
              >
                Magic Link
              </Button>
            </div>

            {mode === "password" ? (
              <form
                className="space-y-3"
                onSubmit={emailPasswordForm.handleSubmit(async (values) => {
                  await handlePasswordSignIn(values);
                })}
              >
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300">
                    Email
                  </label>
                  <Input id="login-email" type="email" autoComplete="email" {...emailPasswordForm.register("email")} />
                  <p className="text-xs text-rose-300">{emailPasswordForm.formState.errors.email?.message}</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300">
                    Password
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    {...emailPasswordForm.register("password")}
                  />
                  <p className="text-xs text-rose-300">{emailPasswordForm.formState.errors.password?.message}</p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!supabaseEnabled || emailPasswordForm.formState.isSubmitting}
                >
                  {emailPasswordForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            ) : (
              <form
                className="space-y-3"
                onSubmit={magicLinkForm.handleSubmit(async (values) => {
                  await handleMagicLink(values);
                })}
              >
                <div className="space-y-1.5">
                  <label htmlFor="magic-email" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300">
                    Work email
                  </label>
                  <Input id="magic-email" type="email" autoComplete="email" {...magicLinkForm.register("email")} />
                  <p className="text-xs text-rose-300">{magicLinkForm.formState.errors.email?.message}</p>
                </div>
                <Button type="submit" className="w-full" disabled={!supabaseEnabled || magicLinkForm.formState.isSubmitting}>
                  {magicLinkForm.formState.isSubmitting ? "Sending..." : "Send magic link"}
                </Button>
              </form>
            )}
          </div>
        )}

        {errorMessage ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</p>
        ) : null}

        {statusMessage ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
            {statusMessage}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
