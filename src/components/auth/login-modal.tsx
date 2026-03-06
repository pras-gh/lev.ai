"use client";

import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type LoginModalProps = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

export function LoginModal({ triggerClassName, onTriggerClick }: LoginModalProps) {
  const productLoginUrl = normalizeBookingUrl(siteConfig.productLoginUrl);

  return (
    <a
      href={productLoginUrl}
      onClick={() => {
        onTriggerClick?.();
      }}
      className={cn("lev-button lev-button--outline", triggerClassName)}
    >
      Login
    </a>
  );
}
