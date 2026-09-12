import type { Metadata } from "next";
import { TimeConverter } from "@/components/time-converter";

export const metadata: Metadata = { title: "Time Unit Converter — DevUtils" };

export default function TimePage() {
  return <TimeConverter />;
}
