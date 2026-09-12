import { open, showToast, Toast } from "@raycast/api";

const DEVUTILS_BASE_URL = "https://devutils.jiwei.dev";

export async function openDevUtilsPage(path: string): Promise<void> {
  try {
    const url = new URL(path, DEVUTILS_BASE_URL);
    await open(url.toString());
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open DevUtils",
      message: error instanceof Error ? error.message : "Unable to open the requested page.",
    });
  }
}

export function createOpenCommand(path: string): () => Promise<void> {
  return async function Command() {
    await openDevUtilsPage(path);
  };
}
