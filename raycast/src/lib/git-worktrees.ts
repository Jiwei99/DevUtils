import { execFile } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitBranch = {
  ref: string;
  name: string;
  kind: "local" | "remote";
};

export type GitWorktree = {
  path: string;
  branch?: string;
  bare: boolean;
  locked: boolean;
};

export type GitRepository = {
  path: string;
  name: string;
  remotes: string[];
  branches: GitBranch[];
  worktrees: GitWorktree[];
};

type GitRunOptions = {
  nonInteractive?: boolean;
  timeoutMs?: number;
};

export async function runGit(
  repositoryPath: string,
  args: string[],
  options: GitRunOptions = {},
): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repositoryPath, ...args], {
      maxBuffer: 16 * 1024 * 1024,
      timeout: options.timeoutMs,
      env: options.nonInteractive ? { ...process.env, GIT_TERMINAL_PROMPT: "0" } : undefined,
    });
    return stdout;
  } catch (error) {
    const detail =
      error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "";
    throw new Error(detail || (error instanceof Error ? error.message : "Git command failed."));
  }
}

export async function requireDirectory(directoryPath: string): Promise<string> {
  const stat = await lstat(directoryPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`Choose a real directory, not a file or symbolic link: ${directoryPath}`);
  }
  return realpath(directoryPath);
}

export async function inspectRepository(directoryPath: string): Promise<GitRepository> {
  const resolved = await requireDirectory(directoryPath);
  let root: string;
  try {
    root = (await runGit(resolved, ["rev-parse", "--show-toplevel"])).trim();
  } catch {
    throw new Error(`${directoryPath} is not a non-bare Git repository.`);
  }

  if ((await realpath(root)) !== resolved) {
    throw new Error(`Select the repository root, not a subfolder: ${directoryPath}`);
  }

  const remotes = await listRemotes(resolved);
  const [branches, worktrees] = await Promise.all([
    listBranches(resolved, remotes),
    listWorktrees(resolved),
  ]);
  if (worktrees[0]?.path !== resolved) {
    throw new Error(`Select the main repository checkout, not a linked worktree: ${directoryPath}`);
  }

  return { path: resolved, name: path.basename(resolved), remotes, branches, worktrees };
}

export async function listRemotes(repositoryPath: string): Promise<string[]> {
  return (await runGit(repositoryPath, ["remote"])).split("\n").filter(Boolean);
}

export async function fetchRemote(repositoryPath: string, remoteName: string): Promise<void> {
  if (!(await listRemotes(repositoryPath)).includes(remoteName)) {
    throw new Error(`The remote ${remoteName} is no longer configured in this repository.`);
  }
  await runGit(repositoryPath, ["fetch", "--", remoteName], {
    nonInteractive: true,
    timeoutMs: 5 * 60 * 1000,
  });
}

export async function listBranches(
  repositoryPath: string,
  remotes: string[],
): Promise<GitBranch[]> {
  const output = await runGit(repositoryPath, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/heads",
    "refs/remotes",
  ]);
  const configuredRemotes = new Set(remotes);

  return output
    .split("\n")
    .filter(Boolean)
    .flatMap((ref): GitBranch[] => {
      if (ref.startsWith("refs/heads/")) {
        return [{ ref, name: ref.slice("refs/heads/".length), kind: "local" }];
      }
      if (ref.startsWith("refs/remotes/") && !ref.endsWith("/HEAD")) {
        const name = ref.slice("refs/remotes/".length);
        const remoteName = name.slice(0, name.indexOf("/"));
        if (configuredRemotes.has(remoteName)) return [{ ref, name, kind: "remote" }];
      }
      return [];
    });
}

export async function listWorktrees(repositoryPath: string): Promise<GitWorktree[]> {
  const output = await runGit(repositoryPath, ["worktree", "list", "--porcelain", "-z"]);
  const records: GitWorktree[] = [];
  let current: GitWorktree | undefined;

  for (const item of output.split("\0")) {
    if (!item) {
      if (current) records.push(current);
      current = undefined;
      continue;
    }
    if (item.startsWith("worktree ")) {
      current = { path: item.slice("worktree ".length), bare: false, locked: false };
    } else if (current && item.startsWith("branch ")) {
      current.branch = item.slice("branch ".length);
    } else if (current && item === "bare") {
      current.bare = true;
    } else if (current && (item === "locked" || item.startsWith("locked "))) {
      current.locked = true;
    }
  }
  if (current) records.push(current);
  return records;
}

export function isInside(candidate: string, directory: string): boolean {
  const relative = path.relative(directory, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}
