import type { Metadata } from "next";
import { ShortcutLibrary } from "@/components/shortcut-library";

export const metadata: Metadata = { title: "Keyboard Shortcuts — DevUtils" };

export default function ShortcutsPage() {
  return <ShortcutLibrary />;
}
