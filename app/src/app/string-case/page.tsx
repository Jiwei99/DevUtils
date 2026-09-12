import type { Metadata } from "next";
import { StringCaseConverter } from "@/components/string-case-converter";

export const metadata: Metadata = { title: "String Case Converter — DevUtils" };

export default function StringCasePage() {
  return <StringCaseConverter />;
}
