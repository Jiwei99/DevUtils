import type { Metadata } from "next";
import { CronExplorer } from "@/components/cron-explorer";

export const metadata: Metadata = { title: "Cron Explorer — DevUtils" };

export default function CronPage() {
  return <CronExplorer />;
}
