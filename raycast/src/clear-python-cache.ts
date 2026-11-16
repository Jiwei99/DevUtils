import { confirmAndRunCacheClean } from "./lib/cache-cleaning";

export default async function ClearPythonCache() {
  await confirmAndRunCacheClean({
    commands: process.platform === "win32" ? ["py", "python", "python3"] : ["python3", "python"],
    args: ["-m", "pip", "cache", "purge"],
    confirmationTitle: "Clear the Python package cache?",
    confirmationMessage:
      "This removes pip's cached downloads and wheels for the selected Python command. Virtual environments and installed packages are preserved, but future installs may need to download or rebuild packages.\n\nCommand: python -m pip cache purge",
    actionTitle: "Clear pip Cache",
    runningTitle: "Clearing Python package cache",
    runningMessage: "pip downloads and wheels",
    successTitle: "Python package cache cleared",
  });
}
