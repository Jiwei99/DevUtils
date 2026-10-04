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

export type ManifestWorktree = {
  source: string;
  path: string;
  selectedRef: string;
  checkedOutBranch: string;
};

export type GroupManifest = {
  version: 1 | 2;
  createdAt: string;
  ownsFolder?: boolean;
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
  createFolder: boolean;
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
  removeFolder: boolean;
};

export type PreparedDestination = {
  folder: string;
  createFolder: boolean;
};

export type ManagedGroupInspection = GroupInspection & {
  manifest: GroupManifest;
};

export type UpdatePlan = {
  folder: string;
  additions: PlannedWorktree[];
  removals: InspectedWorktree[];
};

export type UpdateProgress = {
  completed: number;
  total: number;
  phase: "adding" | "removing";
};

export type UpdateResult = {
  added: number;
  removed: number;
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

async function requireMissing(targetPath: string, message: string): Promise<void> {
  try {
    await lstat(targetPath);
    throw new Error(message);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}

export async function prepareDestination(
  destinationParent: string,
  groupNameInput: string,
): Promise<PreparedDestination> {
  const parent = await requireDirectory(destinationParent);
  await access(parent, constants.W_OK);
  const requestedName = groupNameInput.trim();
  const createFolder = requestedName.length > 0;
  const folder = createFolder ? path.join(parent, validateFolderName(requestedName)) : parent;

  if (createFolder) {
    await requireMissing(folder, `The destination already exists: ${folder}`);
  } else {
    await requireMissing(
      path.join(folder, MANIFEST_NAME),
      `The destination already contains a DevUtils worktree group: ${folder}`,
    );
  }

  return { folder, createFolder };
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

async function planWorktrees(
  repositoryPaths: string[],
  folder: string,
  groupName: string,
  selections: Record<string, BranchSelection>,
  reservedChildNames: string[] = [],
): Promise<PlannedWorktree[]> {
  const repositories = await Promise.all(repositoryPaths.map(inspectRepository));
  if (new Set(repositories.map((repository) => repository.path)).size !== repositories.length) {
    throw new Error("Select each repository only once.");
  }
  if (repositories.some((repository) => isInside(folder, repository.path))) {
    throw new Error("Create worktree groups outside the selected source repositories.");
  }

  const usedChildNames = new Set(reservedChildNames.map((name) => name.toLowerCase()));
  return Promise.all(
    repositories.map(async (repository): Promise<PlannedWorktree> => {
      const selection = selections[repository.path];
      const target = repository.branches.find((branch) => branch.ref === selection?.ref);
      if (!target) throw new Error(`Select an available target branch for ${repository.name}.`);

      let childName = repository.name;
      let suffix = 2;
      while (usedChildNames.has(childName.toLowerCase()))
        childName = `${repository.name}-${suffix++}`;
      usedChildNames.add(childName.toLowerCase());
      const worktreePath = path.join(folder, childName);
      await requireMissing(
        worktreePath,
        `The worktree destination already exists for ${repository.name}: ${worktreePath}`,
      );

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
        path: worktreePath,
        selectedRef: target.ref,
        checkedOutBranch: branchPlan.checkedOutBranch,
        mode: branchPlan.mode,
        target,
        requestedNewBranchName,
      };
    }),
  );
}

export async function validateNewBranchName(
  repository: GitRepository,
  input: string,
): Promise<string> {
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
  const { folder, createFolder } = await prepareDestination(destinationParent, groupNameInput);
  const groupName = groupNameInput.trim() || path.basename(folder);

  const worktrees = await planWorktrees(repositoryPaths, folder, groupName, selections);

  return { folder, createFolder, worktrees };
}

async function writeManifest(folder: string, manifest: GroupManifest): Promise<void> {
  const manifestPath = path.join(folder, MANIFEST_NAME);
  const temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w" });
  await rename(temporaryPath, manifestPath);
}

async function addPlannedWorktree(worktree: PlannedWorktree): Promise<void> {
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
}

export async function createGroup(
  plan: CreatePlan,
  onProgress?: (completed: number) => void,
): Promise<number> {
  // Recheck the filesystem and refs after the user's confirmation.
  const fresh = await prepareCreatePlan(
    plan.worktrees.map((worktree) => worktree.source),
    plan.createFolder ? path.dirname(plan.folder) : plan.folder,
    plan.createFolder ? path.basename(plan.folder) : "",
    Object.fromEntries(
      plan.worktrees.map((worktree) => [
        worktree.source,
        { ref: worktree.selectedRef, newBranchName: worktree.requestedNewBranchName },
      ]),
    ),
  );
  if (
    fresh.folder !== plan.folder ||
    fresh.createFolder !== plan.createFolder ||
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
  if (fresh.createFolder) await mkdir(fresh.folder);
  const manifest: GroupManifest = {
    version: 2,
    createdAt: new Date().toISOString(),
    ownsFolder: fresh.createFolder,
    worktrees: [],
  };
  let completed = 0;

  try {
    await writeManifest(fresh.folder, manifest);
    for (const worktree of fresh.worktrees) {
      await addPlannedWorktree(worktree);
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
      (parsed.version !== 1 && parsed.version !== 2) ||
      !("worktrees" in parsed) ||
      !Array.isArray(parsed.worktrees)
    ) {
      throw new Error("Invalid DevUtils group manifest.");
    }
    const manifest = parsed as GroupManifest;
    if (
      typeof manifest.createdAt !== "string" ||
      (manifest.version === 2 && typeof manifest.ownsFolder !== "boolean")
    ) {
      throw new Error("Invalid DevUtils group manifest.");
    }
    if (
      manifest.worktrees.some(
        (item) =>
          !item ||
          typeof item.path !== "string" ||
          typeof item.source !== "string" ||
          typeof item.selectedRef !== "string" ||
          typeof item.checkedOutBranch !== "string" ||
          !path.isAbsolute(item.path) ||
          !path.isAbsolute(item.source) ||
          !isInside(item.path, folder),
      )
    ) {
      throw new Error("The DevUtils group manifest contains invalid paths.");
    }
    if (new Set(manifest.worktrees.map((item) => item.path)).size !== manifest.worktrees.length) {
      throw new Error("The DevUtils group manifest contains duplicate worktree paths.");
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
  sourceMustBeOutsideGroup: boolean,
): Promise<InspectedWorktree> {
  const root = (await runGit(childPath, ["rev-parse", "--show-toplevel"])).trim();
  if ((await realpath(root)) !== childPath) throw new Error(`${childPath} is not a worktree root.`);

  const worktrees = await listWorktrees(childPath);
  const main = worktrees[0];
  const linked = worktrees.slice(1).find((worktree) => worktree.path === childPath);
  if (
    !main ||
    !linked ||
    linked.bare ||
    (sourceMustBeOutsideGroup && isInside(main.path, groupFolder))
  ) {
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
  const removeFolder = manifest?.ownsFolder ?? true;
  const items = (await readdir(folder, { withFileTypes: true })).filter(
    (item) => item.name !== MANIFEST_NAME,
  );
  const invalid = items.filter((item) => !item.isDirectory() || item.isSymbolicLink());
  if (removeFolder && invalid.length) {
    throw new Error(
      `Folder contains non-worktree items: ${invalid.map((item) => item.name).join(", ")}`,
    );
  }

  const inspected = await Promise.all(
    items
      .filter((item) => item.isDirectory() && !item.isSymbolicLink())
      .map(async (item) => {
        const childPath = await requireDirectory(path.join(folder, item.name));
        try {
          return await inspectLinkedWorktree(childPath, folder, removeFolder);
        } catch (error) {
          // A reused destination may contain unrelated directories. DevUtils-owned and
          // legacy folders stay strict because removing the group may remove the folder.
          if (removeFolder) throw error;
          return undefined;
        }
      }),
  );
  const worktrees = inspected.filter(
    (worktree): worktree is InspectedWorktree => worktree !== undefined,
  );
  if (worktrees.length === 0 && !manifest)
    throw new Error("The selected folder has no linked worktrees.");

  return {
    folder,
    worktrees,
    issues: worktrees.flatMap((worktree) =>
      worktree.issues.map((issue) => `${path.basename(worktree.path)}: ${issue}`),
    ),
    hasManifest: Boolean(manifest),
    removeFolder,
  };
}

export async function inspectManagedGroup(folderPath: string): Promise<ManagedGroupInspection> {
  const inspection = await inspectGroup(folderPath);
  const existing = await readManifest(inspection.folder);
  const manifest: GroupManifest = {
    version: existing?.version ?? 2,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    ownsFolder: existing?.ownsFolder ?? false,
    worktrees: inspection.worktrees.map((worktree) => {
      const recorded = existing?.worktrees.find(
        (item) => item.path === worktree.path && item.source === worktree.source,
      );
      return {
        source: worktree.source,
        path: worktree.path,
        selectedRef:
          recorded?.selectedRef ?? (worktree.branch ? `refs/heads/${worktree.branch}` : "HEAD"),
        checkedOutBranch: worktree.branch ?? "HEAD",
      };
    }),
  };
  return { ...inspection, manifest };
}

export async function prepareUpdatePlan(
  folderPath: string,
  repositoryPaths: string[],
  selections: Record<string, BranchSelection>,
  removalPaths: string[],
): Promise<UpdatePlan> {
  const group = await inspectManagedGroup(folderPath);
  const removalSet = new Set(removalPaths);
  if (removalSet.size !== removalPaths.length) {
    throw new Error("Select each worktree for removal only once.");
  }

  const removals = group.worktrees.filter((worktree) => removalSet.has(worktree.path));
  if (removals.length !== removalSet.size) {
    throw new Error("A selected worktree is no longer part of this group.");
  }
  const blocked = removals.flatMap((worktree) =>
    worktree.issues.map((issue) => `${path.basename(worktree.path)}: ${issue}`),
  );
  if (blocked.length) {
    throw new Error(`Cannot remove worktrees with local changes: ${blocked.join("; ")}`);
  }

  const currentSources = new Set(group.worktrees.map((worktree) => worktree.source));
  const additions = await planWorktrees(
    repositoryPaths,
    group.folder,
    path.basename(group.folder),
    selections,
    group.worktrees.map((worktree) => path.basename(worktree.path)),
  );
  const duplicate = additions.find((worktree) => currentSources.has(worktree.source));
  if (duplicate) {
    throw new Error(`${duplicate.sourceName} is already part of this worktree group.`);
  }
  if (additions.length === 0 && removals.length === 0) {
    throw new Error("Add or remove at least one repository before updating the group.");
  }

  return { folder: group.folder, additions, removals };
}

function sameUpdatePlan(first: UpdatePlan, second: UpdatePlan): boolean {
  return (
    first.folder === second.folder &&
    first.additions.length === second.additions.length &&
    first.removals.length === second.removals.length &&
    first.additions.every((worktree, index) => {
      const other = second.additions[index];
      if (!other) return false;
      return (
        worktree.source === other.source &&
        worktree.path === other.path &&
        worktree.selectedRef === other.selectedRef &&
        worktree.checkedOutBranch === other.checkedOutBranch &&
        worktree.mode === other.mode
      );
    }) &&
    first.removals.every((worktree, index) => {
      const other = second.removals[index];
      if (!other) return false;
      return (
        worktree.source === other.source &&
        worktree.path === other.path &&
        worktree.branch === other.branch
      );
    })
  );
}

export async function updateGroup(
  plan: UpdatePlan,
  onProgress?: (progress: UpdateProgress) => void,
): Promise<UpdateResult> {
  const selections = Object.fromEntries(
    plan.additions.map((worktree) => [
      worktree.source,
      { ref: worktree.selectedRef, newBranchName: worktree.requestedNewBranchName },
    ]),
  );
  const fresh = await prepareUpdatePlan(
    plan.folder,
    plan.additions.map((worktree) => worktree.source),
    selections,
    plan.removals.map((worktree) => worktree.path),
  );
  if (!sameUpdatePlan(plan, fresh)) {
    throw new Error("The worktree group changed after confirmation. Review it and try again.");
  }

  const inspected = await inspectManagedGroup(fresh.folder);
  const manifest: GroupManifest = {
    version: 2,
    createdAt: inspected.manifest.createdAt,
    ownsFolder: inspected.manifest.ownsFolder ?? true,
    worktrees: [...inspected.manifest.worktrees],
  };
  const total = fresh.additions.length + fresh.removals.length;
  let completed = 0;
  let added = 0;
  let removed = 0;

  try {
    for (const worktree of fresh.additions) {
      await addPlannedWorktree(worktree);
      manifest.worktrees.push({
        source: worktree.source,
        path: worktree.path,
        selectedRef: worktree.selectedRef,
        checkedOutBranch: worktree.checkedOutBranch,
      });
      await writeManifest(fresh.folder, manifest);
      added++;
      completed++;
      onProgress?.({ completed, total, phase: "adding" });
    }

    for (const worktree of fresh.removals) {
      const current = await inspectLinkedWorktree(
        worktree.path,
        fresh.folder,
        manifest.ownsFolder ?? true,
      );
      if (current.issues.length || current.source !== worktree.source) {
        throw new Error(`Removal blocked: ${path.basename(worktree.path)} changed during update.`);
      }
      await runGit(worktree.source, ["worktree", "remove", worktree.path]);
      manifest.worktrees = manifest.worktrees.filter((item) => item.path !== worktree.path);
      await writeManifest(fresh.folder, manifest);
      removed++;
      completed++;
      onProgress?.({ completed, total, phase: "removing" });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Update failed.";
    throw new PartialGroupError(
      `${completed} of ${total} changes applied. ${detail}`,
      fresh.folder,
      completed,
    );
  }

  return { added, removed };
}

export async function removeGroup(
  inspection: GroupInspection,
  onProgress?: (completed: number) => void,
): Promise<number> {
  const fresh = await inspectGroup(inspection.folder);
  if (fresh.issues.length) throw new Error(`Removal blocked: ${fresh.issues.join("; ")}`);
  if (
    fresh.removeFolder !== inspection.removeFolder ||
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
      const current = await inspectLinkedWorktree(worktree.path, fresh.folder, fresh.removeFolder);
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
    if (fresh.removeFolder) {
      await rmdir(fresh.folder); // This cannot remove a folder containing unrelated files.
    }
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
