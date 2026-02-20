"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
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
import { cn } from "@/lib/utils";

type LoginModalProps = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

export function LoginModal({ triggerClassName, onTriggerClick }: LoginModalProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignedIn = Boolean(session?.user);
  const triggerLabel = status === "loading" ? "Login" : isSignedIn ? "Account" : "Login";

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setErrorMessage(null);

    const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";
    const response = await signIn("google", {
      callbackUrl,
      redirect: false,
    });

    if (response?.error) {
      setErrorMessage(response.error);
      setIsSubmitting(false);
      return;
    }

    if (response?.url && typeof window !== "undefined") {
      window.location.assign(response.url);
      return;
    }

    setIsSubmitting(false);
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    setErrorMessage(null);

    const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";
    const response = await signOut({
      callbackUrl,
      redirect: false,
    });

    if (response?.url && typeof window !== "undefined") {
      window.location.assign(response.url);
      return;
    }

    setIsSubmitting(false);
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setErrorMessage(null);
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
            {isSignedIn ? "Your session is managed by NextAuth." : "Continue securely with Google using NextAuth."}
          </DialogDescription>
        </DialogHeader>

        {isSignedIn ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">Signed in as</p>
            <p className="text-sm font-semibold text-white">{session?.user?.email ?? "Unknown user"}</p>
            <Button variant="outline" onClick={() => void handleSignOut()} disabled={isSubmitting}>
              {isSubmitting ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => void handleGoogleSignIn()} disabled={isSubmitting}>
            {isSubmitting ? "Redirecting..." : "Continue with Google"}
          </Button>
        )}

        {errorMessage ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</p>
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
