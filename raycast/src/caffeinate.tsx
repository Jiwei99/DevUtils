import { Action, ActionPanel, Detail, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { useCallback, useEffect, useState } from "react";

const execFileAsync = promisify(execFile);
const SESSION_KEY = "caffeinate.session";
const CAFFEINATE_PATH = "/usr/bin/caffeinate";
const CAFFEINATE_ARGUMENTS = ["-d", "-i"] as const;

type CaffeinateSession = {
  pid: number;
  startedAt: string;
  processStartedAt: string;
  executable: typeof CAFFEINATE_PATH;
  arguments: ["-d", "-i"];
};

type ProcessInfo = {
  command: string;
  startedAt: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Caffeinate could not be updated.";
}

function isStoredSession(value: unknown): value is CaffeinateSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<CaffeinateSession>;
  return (
    Number.isInteger(session.pid) &&
    (session.pid ?? 0) > 0 &&
    typeof session.startedAt === "string" &&
    !Number.isNaN(Date.parse(session.startedAt)) &&
    typeof session.processStartedAt === "string" &&
    session.processStartedAt.length > 0 &&
    session.executable === CAFFEINATE_PATH &&
    Array.isArray(session.arguments) &&
    session.arguments.length === 2 &&
    session.arguments[0] === "-d" &&
    session.arguments[1] === "-i"
  );
}

async function readProcessInfo(pid: number): Promise<ProcessInfo | undefined> {
  try {
    // `comm` must be the last column: macOS truncates it to 16 characters
    // ("/usr/bin/caffein") when another column follows it.
    const result = await execFileAsync(
      "/bin/ps",
      ["-p", String(pid), "-o", "lstart=", "-o", "comm="],
      { timeout: 2_000 },
    );
    const match = result.stdout.trim().match(/^(.*\S)\s+(\/.+)$/);
    if (!match) return undefined;
    return { command: match[2].trim(), startedAt: match[1] };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 1) return undefined;
    throw error;
  }
}

async function sessionOwnsProcess(session: CaffeinateSession): Promise<boolean> {
  const processInfo = await readProcessInfo(session.pid);
  return (
    processInfo !== undefined &&
    processInfo.command === CAFFEINATE_PATH &&
    processInfo.startedAt === session.processStartedAt
  );
}

async function removeStoredSession(): Promise<void> {
  await LocalStorage.removeItem(SESSION_KEY);
}

async function readActiveSession(): Promise<CaffeinateSession | undefined> {
  const stored = await LocalStorage.getItem<string>(SESSION_KEY);
  if (stored === undefined) return undefined;

  let session: unknown;
  try {
    session = JSON.parse(stored);
  } catch {
    await removeStoredSession();
    return undefined;
  }

  if (!isStoredSession(session) || !(await sessionOwnsProcess(session))) {
    await removeStoredSession();
    return undefined;
  }
  return session;
}

async function startCaffeinate(): Promise<{ session: CaffeinateSession; alreadyActive: boolean }> {
  const currentSession = await readActiveSession();
  if (currentSession) return { session: currentSession, alreadyActive: true };

  const child = spawn(CAFFEINATE_PATH, CAFFEINATE_ARGUMENTS, {
    detached: true,
    stdio: "ignore",
  });
  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => reject(error);
    child.once("error", handleError);
    child.once("spawn", () => {
      child.removeListener("error", handleError);
      resolve();
    });
  });
  child.on("error", () => undefined);
  child.unref();

  const pid = child.pid;
  if (!pid) throw new Error("Caffeinate started without a process ID.");

  try {
    const processInfo = await readProcessInfo(pid);
    if (!processInfo || processInfo.command !== CAFFEINATE_PATH) {
      throw new Error("Caffeinate stopped before its session could be recorded.");
    }

    const session: CaffeinateSession = {
      pid,
      startedAt: new Date().toISOString(),
      processStartedAt: processInfo.startedAt,
      executable: CAFFEINATE_PATH,
      arguments: ["-d", "-i"],
    };
    await LocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { session, alreadyActive: false };
  } catch (error) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // The process may already have exited.
    }
    throw error;
  }
}

async function stopCaffeinate(): Promise<boolean> {
  const session = await readActiveSession();
  if (!session) return false;

  try {
    process.kill(session.pid, "SIGTERM");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") {
      await removeStoredSession();
      return true;
    }
    throw error;
  }

  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!(await sessionOwnsProcess(session))) {
      await removeStoredSession();
      return true;
    }
  }
  throw new Error("Caffeinate did not stop. Try again.");
}

function formatStartedAt(startedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(startedAt));
}

function formatDuration(startedAt: string, now: number): string {
  const totalMinutes = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 60_000));
  if (totalMinutes < 1) return "Less than a minute";
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
}

export default function Caffeinate() {
  const [session, setSession] = useState<CaffeinateSession | null>();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const isMacOS = process.platform === "darwin";

  const refresh = useCallback(async (showErrors: boolean) => {
    try {
      setSession((await readActiveSession()) ?? null);
    } catch (error) {
      setSession(null);
      if (showErrors) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not check Caffeinate",
          message: errorMessage(error),
        });
      }
    }
  }, []);

  useEffect(() => {
    if (isMacOS) void refresh(true);
    else setSession(null);
  }, [isMacOS, refresh]);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      void refresh(false);
    }, 30_000);
    return () => clearInterval(timer);
  }, [refresh, session]);

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting Caffeinate" });
    try {
      const result = await startCaffeinate();
      setSession(result.session);
      setNow(Date.now());
      toast.style = Toast.Style.Success;
      toast.title = result.alreadyActive ? "Caffeinate is already active" : "Caffeinate started";
      toast.message = `Active since ${formatStartedAt(result.session.startedAt)}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Caffeinate could not start";
      toast.message = errorMessage(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (busy) return;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping Caffeinate" });
    try {
      const stopped = await stopCaffeinate();
      setSession(null);
      toast.style = Toast.Style.Success;
      toast.title = stopped ? "Caffeinate stopped" : "Caffeinate was already inactive";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Caffeinate could not stop";
      toast.message = errorMessage(error);
      await refresh(false);
    } finally {
      setBusy(false);
    }
  }

  if (!isMacOS) {
    return <Detail markdown="# Caffeinate\n\nThis command is available on macOS." />;
  }

  const markdown =
    session === undefined
      ? "# Checking Caffeinate…"
      : session
        ? "# Caffeinate is active\n\nYour display will stay awake and your Mac will not enter idle system sleep. Closing Raycast does not stop this session."
        : "# Caffeinate is inactive\n\nYour Mac can sleep normally. Start Caffeinate to keep the display awake and prevent idle system sleep.";

  return (
    <Detail
      markdown={markdown}
      metadata={
        session === undefined ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text={session ? "Active" : "Inactive"}
              icon={session ? Icon.Sun : Icon.Moon}
            />
            {session ? (
              <>
                <Detail.Metadata.Label title="Started" text={formatStartedAt(session.startedAt)} />
                <Detail.Metadata.Label
                  title="Duration"
                  text={formatDuration(session.startedAt, now)}
                />
              </>
            ) : null}
          </Detail.Metadata>
        )
      }
      actions={
        session === undefined ? undefined : (
          <ActionPanel>
            {session ? (
              <Action title="Stop Caffeinate" icon={Icon.Stop} onAction={() => void handleStop()} />
            ) : (
              <Action
                title="Start Caffeinate"
                icon={Icon.Play}
                onAction={() => void handleStart()}
              />
            )}
            <Action
              title="Refresh Status"
              icon={Icon.ArrowClockwise}
              onAction={() => void refresh(true)}
            />
          </ActionPanel>
        )
      }
    />
  );
}
