import type { Metadata } from "next";
import { EncoderDecoder } from "@/components/encoder-decoder";

export const metadata: Metadata = { title: "Encoder / Decoder — DevUtils" };

export default function EncoderPage() {
  return <EncoderDecoder />;
}
