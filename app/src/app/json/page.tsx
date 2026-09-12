import type { Metadata } from "next";
import { JsonFormatter } from "@/components/json-formatter";

export const metadata: Metadata = { title: "JSON Formatter — DevUtils" };

export default function JsonFormatterPage() {
  return <JsonFormatter />;
}
