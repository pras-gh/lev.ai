"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type SignupValues = z.infer<typeof signupSchema>;
type AuthMode = "login" | "signup";

type LoginModalProps = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

export function LoginModal({ triggerClassName, onTriggerClick }: LoginModalProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const isSignedIn = Boolean(session?.user);
  const triggerLabel = status === "loading" ? "Login" : isSignedIn ? "Account" : "Login / Sign up";

  async function signInAndRedirect(email: string, password: string) {
    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!response) {
      setErrorMessage("Unable to sign in right now. Try again.");
      return false;
    }

    if (response.error) {
      if (response.error === "Configuration") {
        setErrorMessage("Login is not configured yet. Please try again shortly.");
        return false;
      }
      setErrorMessage("Invalid email or password.");
      return false;
    }

    const nextSession = await getSession();
    if (!nextSession?.user) {
      setErrorMessage("Unable to create login session. Try again.");
      return false;
    }

    const nextPath =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const targetPath = nextPath && nextPath.startsWith("/app") ? nextPath : "/app/dashboard";

    loginForm.reset();
    signupForm.reset();
    setOpen(false);
    router.push(targetPath);
    return true;
  }

  async function handleLogin(values: LoginValues) {
    setErrorMessage(null);
    await signInAndRedirect(values.email, values.password);
  }

  async function handleSignup(values: SignupValues) {
    setErrorMessage(null);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; requiresEmailConfirmation?: boolean }
      | null;
    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Unable to create account. Try again.");
      return;
    }

    if (payload?.requiresEmailConfirmation) {
      setAuthMode("login");
      loginForm.setValue("email", values.email);
      setErrorMessage("Account created. Verify your email, then log in.");
      return;
    }

    const signedIn = await signInAndRedirect(values.email, values.password);
    if (!signedIn) {
      setAuthMode("login");
      loginForm.setValue("email", values.email);
      setErrorMessage("Account created. Please log in.");
    }
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
          setAuthMode("login");
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
          <DialogTitle>
            {isSignedIn ? "Account" : authMode === "login" ? "Login to trai\\" : "Sign up for trai\\"}
          </DialogTitle>
          <DialogDescription>
            {isSignedIn
              ? "You already have product access."
              : authMode === "login"
                ? "Login with your email and password to access trai\\."
                : "Create your account to access trai\\ product dashboard."}
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode("login");
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  authMode === "login"
                    ? "bg-white text-[#0b0d12]"
                    : "text-slate-200 hover:bg-white/10"
                )}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode("signup");
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  authMode === "signup"
                    ? "bg-white text-[#0b0d12]"
                    : "text-slate-200 hover:bg-white/10"
                )}
              >
                Sign up
              </button>
            </div>

            {authMode === "login" ? (
              <form
                className="space-y-3"
                onSubmit={loginForm.handleSubmit(async (values) => {
                  await handleLogin(values);
                })}
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
                  >
                    Email
                  </label>
                  <Input id="login-email" type="email" autoComplete="email" {...loginForm.register("email")} />
                  <p className="text-xs text-rose-300">{loginForm.formState.errors.email?.message}</p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
                  >
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
            ) : (
              <form
                className="space-y-3"
                onSubmit={signupForm.handleSubmit(async (values) => {
                  await handleSignup(values);
                })}
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-name"
                    className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
                  >
                    Name
                  </label>
                  <Input id="signup-name" autoComplete="name" {...signupForm.register("name")} />
                  <p className="text-xs text-rose-300">{signupForm.formState.errors.name?.message}</p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-email"
                    className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
                  >
                    Email
                  </label>
                  <Input id="signup-email" type="email" autoComplete="email" {...signupForm.register("email")} />
                  <p className="text-xs text-rose-300">{signupForm.formState.errors.email?.message}</p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-password"
                    className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
                  >
                    Password
                  </label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    {...signupForm.register("password")}
                  />
                  <p className="text-xs text-rose-300">{signupForm.formState.errors.password?.message}</p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-confirm-password"
                    className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300"
                  >
                    Confirm password
                  </label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    {...signupForm.register("confirmPassword")}
                  />
                  <p className="text-xs text-rose-300">{signupForm.formState.errors.confirmPassword?.message}</p>
                </div>

                <Button type="submit" className="w-full" disabled={signupForm.formState.isSubmitting}>
                  {signupForm.formState.isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>
            )}
          </div>
        )}

        {errorMessage ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
