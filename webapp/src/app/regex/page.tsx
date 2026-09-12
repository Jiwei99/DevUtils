import type { Metadata } from "next";
import { RegexTester } from "@/components/regex-tester";

export const metadata: Metadata = { title: "Regex Tester — DevUtils" };

export default function RegexPage() {
  return <RegexTester />;
}
