import { Alert, Toast, confirmAlert, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { delimiter } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type ToolResult = {
  command: string;
  stdout: string;
  stderr: string;
};

type CacheCleanRequest = {
  actionTitle: string;
  args: string[];
  commands: string[];
  confirmationMessage: string;
  confirmationTitle: string;
  cwd?: string;
  runningMessage: string;
  runningTitle: string;
  successTitle: string;
};

type CacheCleanBatchItem = {
  args: string[];
  cwd?: string;
  label: string;
};

type CacheCleanBatchRequest = {
  actionTitle: string;
  commands: string[];
  confirmationMessage: string;
  confirmationTitle: string;
  items: CacheCleanBatchItem[];
  runningTitle: string;
  successTitle: string;
};

function executablePath(): string {
  const current = process.env.PATH ?? "";
  if (process.platform === "win32") return current;

  const home = homedir();
  return [
    current,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    `${home}/.cargo/bin`,
    `${home}/.pyenv/shims`,
    `${home}/.local/bin`,
    `${home}/go/bin`,
  ]
    .filter(Boolean)
    .join(delimiter);
}

function errorDetail(error: unknown): string {
  if (!(error instanceof Error)) return "The cache command failed.";
  const commandError = error as Error & { stderr?: string; stdout?: string };
  return commandError.stderr?.trim() || commandError.stdout?.trim() || error.message;
}

export async function runDeveloperTool(
  commands: string[],
  args: string[],
  cwd?: string,
): Promise<ToolResult> {
  let missingCommand: string | undefined;

  for (const command of commands) {
    try {
      const result = await execFileAsync(command, args, {
        cwd,
        env: { ...process.env, PATH: executablePath() },
        maxBuffer: 10 * 1024 * 1024,
        timeout: 10 * 60 * 1000,
      });
      return { command, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        missingCommand = command;
        continue;
      }
      throw new Error(errorDetail(error));
    }
  }

  throw new Error(
    `${missingCommand ?? commands[0]} was not found. Install it or make it available in PATH.`,
  );
}

export async function confirmAndRunCacheClean(request: CacheCleanRequest): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: request.confirmationTitle,
    message: request.confirmationMessage,
    primaryAction: { title: request.actionTitle, style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return false;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: request.runningTitle,
    message: request.runningMessage,
  });
  try {
    const result = await runDeveloperTool(request.commands, request.args, request.cwd);
    toast.style = Toast.Style.Success;
    toast.title = request.successTitle;
    toast.message = result.stdout || result.stderr || request.runningMessage;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Cache cleanup failed";
    toast.message = errorDetail(error);
    return false;
  }
}

export async function confirmAndRunCacheCleanBatch(
  request: CacheCleanBatchRequest,
): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: request.confirmationTitle,
    message: request.confirmationMessage,
    primaryAction: { title: request.actionTitle, style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return false;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: request.runningTitle,
    message: `1 of ${request.items.length} · ${request.items[0]?.label ?? ""}`,
  });
  const failures: { label: string; detail: string }[] = [];

  for (const [index, item] of request.items.entries()) {
    toast.message = `${index + 1} of ${request.items.length} · ${item.label}`;
    try {
      await runDeveloperTool(request.commands, item.args, item.cwd);
    } catch (error) {
      failures.push({ label: item.label, detail: errorDetail(error) });
    }
  }

  if (failures.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = request.successTitle;
    toast.message = `${request.items.length} project${request.items.length === 1 ? "" : "s"} cleared`;
    return true;
  }

  const completed = request.items.length - failures.length;
  toast.style = Toast.Style.Failure;
  toast.title = `Cleared ${completed} of ${request.items.length} projects`;
  toast.message =
    failures.length === 1
      ? `${failures[0].label}: ${failures[0].detail}`
      : `Failed: ${failures.map((failure) => failure.label).join(", ")}`;
  return false;
}
