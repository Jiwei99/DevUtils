import type { Metadata } from "next";
import { NumberBaseConverter } from "@/components/number-base-converter";

export const metadata: Metadata = { title: "Number Base Converter — DevUtils" };

export default function NumberBasePage() {
  return <NumberBaseConverter />;
}
