import { redirect } from "next/navigation";

export default function DashboardTransactionsLegacyPage() {
  redirect("/app/ledger");
}
