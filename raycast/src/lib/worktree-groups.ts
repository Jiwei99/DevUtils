import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import {
  inspectRepository,
  isInside,
  listWorktrees,
  requireDirectory,
  runGit,
  type GitBranch,
  type GitRepository,
} from "./git-worktrees";

const MANIFEST_NAME = ".devutils-worktree-group.json";

type ManifestWorktree = {
  source: string;
  path: string;
  selectedRef: string;
  checkedOutBranch: string;
};

type GroupManifest = {
  version: 1;
  createdAt: string;
  worktrees: ManifestWorktree[];
};

export type PlannedWorktree = ManifestWorktree & {
  sourceName: string;
  mode: "existing" | "new-local" | "new-remote";
  target: GitBranch;
  requestedNewBranchName?: string;
};

export type BranchSelection = {
  ref: string;
  newBranchName?: string;
};

export type CreatePlan = {
  folder: string;
  worktrees: PlannedWorktree[];
};

export type InspectedWorktree = {
  source: string;
  path: string;
  branch?: string;
  issues: string[];
};

export type GroupInspection = {
  folder: string;
  worktrees: InspectedWorktree[];
  issues: string[];
  hasManifest: boolean;
};

export class PartialGroupError extends Error {
  constructor(
    message: string,
    public readonly folder: string,
    public readonly completed: number,
  ) {
    super(message);
  }
}

function slug(value: string): string {
  return (
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "group"
  );
}

function validateFolderName(value: string): string {
  const name = value.trim();
  if (
    !name ||
    name === "." ||
    name === ".." ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0")
  ) {
    throw new Error("Enter a single new folder name without path separators.");
  }
  return name;
}

function availableBranchName(repository: GitRepository, baseName: string): string {
  const existing = new Set(
    repository.branches.filter((branch) => branch.kind === "local").map((branch) => branch.name),
  );
  let candidate = baseName;
  let suffix = 2;
  while (existing.has(candidate)) candidate = `${baseName}-${suffix++}`;
  return candidate;
}

function planBranch(
  repository: GitRepository,
  target: GitBranch,
  groupName: string,
  childName: string,
) {
  const localBranches = new Set(
    repository.branches.filter((branch) => branch.kind === "local").map((branch) => branch.name),
  );
  const uniqueName = () =>
    availableBranchName(repository, `devutils/${slug(groupName)}/${slug(childName)}`);

  if (target.kind === "local") {
    const checkout = repository.worktrees.find((worktree) => worktree.branch === target.ref);
    if (checkout) {
      throw new Error(
        `${repository.name}: ${target.name} is already checked out at ${checkout.path}. Choose another local branch or create a new branch from it.`,
      );
    }
    return { mode: "existing" as const, checkedOutBranch: target.name };
  }

  const remoteBranchName = target.name.slice(target.name.indexOf("/") + 1);
  return {
    mode: "new-remote" as const,
    checkedOutBranch: localBranches.has(remoteBranchName) ? uniqueName() : remoteBranchName,
  };
}

async function validateNewBranchName(repository: GitRepository, input: string): Promise<string> {
  const name = input.trim();
  if (!name) throw new Error(`Enter a new branch name for ${repository.name}.`);
  try {
    await runGit(repository.path, ["check-ref-format", "--branch", name]);
  } catch (error) {
    throw new Error(
      `Invalid new branch name for ${repository.name}: ${error instanceof Error ? error.message : name}`,
    );
  }

  const localBranches = repository.branches
    .filter((branch) => branch.kind === "local")
    .map((branch) => branch.name);
  if (
    localBranches.some(
      (existing) =>
        existing === name || existing.startsWith(`${name}/`) || name.startsWith(`${existing}/`),
    )
  ) {
    throw new Error(
      `The new branch name conflicts with a local branch in ${repository.name}: ${name}`,
    );
  }
  return name;
}

export async function prepareCreatePlan(
  repositoryPaths: string[],
  destinationParent: string,
  groupNameInput: string,
  selections: Record<string, BranchSelection>,
): Promise<CreatePlan> {
  if (repositoryPaths.length === 0) throw new Error("Select at least one repository.");
  const groupName = validateFolderName(groupNameInput);
  const parent = await requireDirectory(destinationParent);
  await access(parent, constants.W_OK);
  const folder = path.join(parent, groupName);

  try {
    await lstat(folder);
    throw new Error(`The destination already exists: ${folder}`);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  const repositories = await Promise.all(repositoryPaths.map(inspectRepository));
  if (new Set(repositories.map((repository) => repository.path)).size !== repositories.length) {
    throw new Error("Select each repository only once.");
  }
  if (repositories.some((repository) => isInside(folder, repository.path))) {
    throw new Error("Create worktree groups outside the selected source repositories.");
  }

  const usedChildNames = new Set<string>();
  const worktrees = await Promise.all(
    repositories.map(async (repository): Promise<PlannedWorktree> => {
      const selection = selections[repository.path];
      const target = repository.branches.find((branch) => branch.ref === selection?.ref);
      if (!target) throw new Error(`Select an available target branch for ${repository.name}.`);

      let childName = repository.name;
      let suffix = 2;
      while (usedChildNames.has(childName.toLowerCase()))
        childName = `${repository.name}-${suffix++}`;
      usedChildNames.add(childName.toLowerCase());

      const requestedNewBranchName =
        selection.newBranchName === undefined
          ? undefined
          : await validateNewBranchName(repository, selection.newBranchName);
      const branchPlan =
        requestedNewBranchName === undefined
          ? planBranch(repository, target, groupName, childName)
          : {
              mode: target.kind === "remote" ? ("new-remote" as const) : ("new-local" as const),
              checkedOutBranch: requestedNewBranchName,
            };
      return {
        source: repository.path,
        sourceName: repository.name,
        path: path.join(folder, childName),
        selectedRef: target.ref,
        checkedOutBranch: branchPlan.checkedOutBranch,
        mode: branchPlan.mode,
        target,
        requestedNewBranchName,
      };
    }),
  );

  return { folder, worktrees };
}

async function writeManifest(folder: string, manifest: GroupManifest): Promise<void> {
  const manifestPath = path.join(folder, MANIFEST_NAME);
  const temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w" });
  await rename(temporaryPath, manifestPath);
}

export async function createGroup(
  plan: CreatePlan,
  onProgress?: (completed: number) => void,
): Promise<number> {
  // Recheck the filesystem and refs after the user's confirmation.
  const fresh = await prepareCreatePlan(
    plan.worktrees.map((worktree) => worktree.source),
    path.dirname(plan.folder),
    path.basename(plan.folder),
    Object.fromEntries(
      plan.worktrees.map((worktree) => [
        worktree.source,
        { ref: worktree.selectedRef, newBranchName: worktree.requestedNewBranchName },
      ]),
    ),
  );
  if (
    fresh.folder !== plan.folder ||
    fresh.worktrees.some(
      (worktree, index) =>
        worktree.path !== plan.worktrees[index]?.path ||
        worktree.mode !== plan.worktrees[index]?.mode ||
        worktree.checkedOutBranch !== plan.worktrees[index]?.checkedOutBranch ||
        worktree.requestedNewBranchName !== plan.worktrees[index]?.requestedNewBranchName,
    )
  ) {
    throw new Error("The worktree plan changed after confirmation. Review it and try again.");
  }
  await mkdir(fresh.folder);
  const manifest: GroupManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    worktrees: [],
  };
  let completed = 0;

  try {
    await writeManifest(fresh.folder, manifest);
    for (const worktree of fresh.worktrees) {
      const args =
        worktree.mode === "existing"
          ? ["worktree", "add", worktree.path, worktree.checkedOutBranch]
          : [
              "worktree",
              "add",
              "--no-track",
              "-b",
              worktree.checkedOutBranch,
              worktree.path,
              worktree.selectedRef,
            ];
      await runGit(worktree.source, args);
      completed++;
      manifest.worktrees.push({
        source: worktree.source,
        path: worktree.path,
        selectedRef: worktree.selectedRef,
        checkedOutBranch: worktree.checkedOutBranch,
      });
      await writeManifest(fresh.folder, manifest);
      onProgress?.(completed);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Creation failed.";
    throw new PartialGroupError(
      `${completed} of ${fresh.worktrees.length} worktrees created. ${detail}`,
      fresh.folder,
      completed,
    );
  }
  return completed;
}

async function readManifest(folder: string): Promise<GroupManifest | undefined> {
  const manifestPath = path.join(folder, MANIFEST_NAME);
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("worktrees" in parsed) ||
      !Array.isArray(parsed.worktrees)
    ) {
      throw new Error("Invalid DevUtils group manifest.");
    }
    const manifest = parsed as GroupManifest;
    if (
      manifest.worktrees.some(
        (item) =>
          !item ||
          typeof item.path !== "string" ||
          typeof item.source !== "string" ||
          !isInside(item.path, folder),
      )
    ) {
      throw new Error("The DevUtils group manifest contains invalid paths.");
    }
    return manifest;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function inspectLinkedWorktree(
  childPath: string,
  groupFolder: string,
): Promise<InspectedWorktree> {
  const root = (await runGit(childPath, ["rev-parse", "--show-toplevel"])).trim();
  if ((await realpath(root)) !== childPath) throw new Error(`${childPath} is not a worktree root.`);

  const worktrees = await listWorktrees(childPath);
  const main = worktrees[0];
  const linked = worktrees.slice(1).find((worktree) => worktree.path === childPath);
  if (!main || !linked || linked.bare || isInside(main.path, groupFolder)) {
    throw new Error(`${childPath} is not a linked worktree with a source outside this folder.`);
  }
  const source = await requireDirectory(main.path);
  const issues: string[] = [];
  if (linked.locked) issues.push("locked");

  const status = await runGit(childPath, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--ignored=matching",
    "--ignore-submodules=none",
  ]);
  const entries = status.split("\0").filter(Boolean);
  const modified = entries.filter(
    (item) => !item.startsWith("??") && !item.startsWith("!!"),
  ).length;
  const untracked = entries.filter((item) => item.startsWith("??")).length;
  const ignored = entries.filter((item) => item.startsWith("!!")).length;
  if (modified) issues.push(`${modified} tracked changes`);
  if (untracked) issues.push(`${untracked} untracked paths`);
  if (ignored) issues.push(`${ignored} ignored paths`);

  const index = await runGit(childPath, ["ls-files", "--stage"]);
  if (index.split("\n").some((item) => item.startsWith("160000 "))) issues.push("submodules");
  return { source, path: childPath, branch: linked.branch?.replace(/^refs\/heads\//, ""), issues };
}

export async function inspectGroup(folderPath: string): Promise<GroupInspection> {
  const folder = await requireDirectory(folderPath);
  try {
    await runGit(folder, ["rev-parse", "--show-toplevel"]);
    throw new Error("Select an enclosing group folder, not a repository or its subfolder.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Select an enclosing")) throw error;
  }

  const manifest = await readManifest(folder);
  const items = await readdir(folder, { withFileTypes: true });
  const children = items.filter((item) => item.name !== MANIFEST_NAME);
  const invalid = children.filter((item) => !item.isDirectory() || item.isSymbolicLink());
  if (invalid.length) {
    throw new Error(
      `Folder contains non-worktree items: ${invalid.map((item) => item.name).join(", ")}`,
    );
  }
  if (children.length === 0 && !manifest)
    throw new Error("The selected folder has no linked worktrees.");

  const worktrees = await Promise.all(
    children.map(async (item) => {
      const childPath = await requireDirectory(path.join(folder, item.name));
      return inspectLinkedWorktree(childPath, folder);
    }),
  );
  if (manifest) {
    for (const worktree of worktrees) {
      const recorded = manifest.worktrees.find((item) => item.path === worktree.path);
      if (recorded && recorded.source !== worktree.source) {
        throw new Error(`The source repository changed for ${path.basename(worktree.path)}.`);
      }
    }
  }

  return {
    folder,
    worktrees,
    issues: worktrees.flatMap((worktree) =>
      worktree.issues.map((issue) => `${path.basename(worktree.path)}: ${issue}`),
    ),
    hasManifest: Boolean(manifest),
  };
}

export async function removeGroup(
  inspection: GroupInspection,
  onProgress?: (completed: number) => void,
): Promise<number> {
  const fresh = await inspectGroup(inspection.folder);
  if (fresh.issues.length) throw new Error(`Removal blocked: ${fresh.issues.join("; ")}`);
  if (
    fresh.worktrees.length !== inspection.worktrees.length ||
    fresh.worktrees.some((worktree, index) => {
      const reviewed = inspection.worktrees[index];
      return (
        worktree.path !== reviewed?.path ||
        worktree.source !== reviewed?.source ||
        worktree.branch !== reviewed?.branch
      );
    })
  ) {
    throw new Error("The worktree group changed after confirmation. Review it and try again.");
  }

  let completed = 0;
  try {
    for (const worktree of fresh.worktrees) {
      const current = await inspectLinkedWorktree(worktree.path, fresh.folder);
      if (current.issues.length || current.source !== worktree.source) {
        throw new Error(`Removal blocked: ${path.basename(worktree.path)} changed during removal.`);
      }
      await runGit(worktree.source, ["worktree", "remove", worktree.path]);
      completed++;
      onProgress?.(completed);
      if (fresh.hasManifest) {
        const manifest = await readManifest(fresh.folder);
        if (manifest) {
          manifest.worktrees = manifest.worktrees.filter((item) => item.path !== worktree.path);
          await writeManifest(fresh.folder, manifest);
        }
      }
    }
    if (fresh.hasManifest) await unlink(path.join(fresh.folder, MANIFEST_NAME));
    await rmdir(fresh.folder); // This cannot remove a folder containing unrelated files.
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Removal failed.";
    throw new PartialGroupError(
      `${completed} of ${fresh.worktrees.length} worktrees removed. ${detail}`,
      fresh.folder,
      completed,
    );
  }
  return completed;
}
