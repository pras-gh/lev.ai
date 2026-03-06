"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type LoginModalProps = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

export function LoginModal({ triggerClassName, onTriggerClick }: LoginModalProps) {
  return (
    <Link
      href="/login"
      onClick={() => {
        onTriggerClick?.();
      }}
      className={cn("lev-button lev-button--outline", triggerClassName)}
    >
      Login
    </Link>
  );
}
