import type { Metadata } from "next";
import { UnixTimeConverter } from "@/components/unix-time-converter";

export const metadata: Metadata = { title: "Unix Time Converter — DevUtils" };

export default function UnixTimePage() {
  return <UnixTimeConverter />;
}
