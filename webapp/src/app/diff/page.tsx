import type { Metadata } from "next";
import { TextDiff } from "@/components/text-diff";

export const metadata: Metadata = { title: "Text & JSON Diff — DevUtils" };

export default function DiffPage() {
  return <TextDiff />;
}
