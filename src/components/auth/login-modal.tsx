"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type LoginModalProps = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

function resolveProductUrl(nextPath: string | null): string {
  const productAppUrl = normalizeBookingUrl(siteConfig.productAppUrl);

  if (!nextPath) {
    return productAppUrl;
  }

  if (/^https?:\/\//i.test(nextPath)) {
    try {
      const appOrigin = new URL(productAppUrl).origin;
      const requestedUrl = new URL(nextPath);
      if (requestedUrl.origin === appOrigin) {
        return requestedUrl.toString();
      }
    } catch {
      return productAppUrl;
    }

    return productAppUrl;
  }

  if (
    nextPath.startsWith("/app") ||
    nextPath.startsWith("/product") ||
    nextPath.startsWith("/dashboard")
  ) {
    try {
      const appOrigin = new URL(productAppUrl).origin;
      const mappedPath = nextPath === "/product" ? "/" : nextPath;
      return new URL(mappedPath, `${appOrigin}/`).toString();
    } catch {
      return productAppUrl;
    }
  }

  return productAppUrl;
}

function buildMagicLinkRedirect(productTarget: string): string {
  const target = new URL(productTarget);
  const callback = new URL("/auth/callback", target.origin);
  callback.searchParams.set("next", `${target.pathname}${target.search}${target.hash}`);
  return callback.toString();
}

export function LoginModal({ triggerClassName, onTriggerClick }: LoginModalProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) {
        return;
      }

      setHasSession(Boolean(data.user) && !error);
    }

    void loadSession();

    function onFocus() {
      void loadSession();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onFocus);
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onFocus);
      }
    };
  }, [supabase]);

  const triggerLabel = hasSession ? "Open App" : "User Sign In";

  async function handleSendMagicLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage("Enter your email to continue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const nextPath =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const targetUrl = resolveProductUrl(nextPath);
    const emailRedirectTo = buildMagicLinkRedirect(targetUrl);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo
      }
    });

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message || "Unable to send magic link right now.");
      return;
    }

    setSuccessMessage("Magic link sent. Check your email and open the link to continue.");
  }

  function openProduct() {
    const nextPath =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const targetUrl = resolveProductUrl(nextPath);
    if (typeof window !== "undefined") {
      window.location.assign(targetUrl);
      return;
    }
    router.push("/product");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setErrorMessage(null);
          setSuccessMessage(null);
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
          <DialogTitle>User Sign In</DialogTitle>
          <DialogDescription>
            Enter your work email. We will send a secure magic link for instant access.
          </DialogDescription>
        </DialogHeader>

        {hasSession ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">You already have an active session.</p>
            <button type="button" className="lev-button lev-button--hero-dark" onClick={openProduct}>
              Open Product
            </button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendMagicLink();
            }}
          >
            <div className="space-y-1.5">
              <label
                htmlFor="magic-email"
                className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
              >
                Email
              </label>
              <Input
                id="magic-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending magic link..." : "Send Magic Link"}
            </Button>
          </form>
        )}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-200">
            {errorMessage}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
