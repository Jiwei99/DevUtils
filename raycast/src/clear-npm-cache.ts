import { confirmAndRunCacheClean } from "./lib/cache-cleaning";

export default async function ClearNpmCache() {
  await confirmAndRunCacheClean({
    commands: process.platform === "win32" ? ["npm.cmd", "npm"] : ["npm"],
    args: ["cache", "clean", "--force"],
    confirmationTitle: "Clear the npm package cache?",
    confirmationMessage:
      "This removes npm's downloaded package cache. Installed packages and project node_modules folders are preserved, but future installs may need to download packages again.\n\nCommand: npm cache clean --force",
    actionTitle: "Clear npm Cache",
    runningTitle: "Clearing npm cache",
    runningMessage: "npm package cache",
    successTitle: "npm cache cleared",
  });
}
