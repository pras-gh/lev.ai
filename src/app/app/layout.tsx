import type { ReactNode } from "react";
import { QueryProvider } from "@/components/product-query-provider";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="product-shell">{children}</div>
    </QueryProvider>
  );
}
