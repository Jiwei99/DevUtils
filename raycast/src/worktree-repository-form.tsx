import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { fetchRemote, inspectRepository, type GitRepository } from "./lib/git-worktrees";
import { validateNewBranchName, type BranchSelection } from "./lib/worktree-groups";

export type ConfiguredRepository = {
  repository: GitRepository;
  selection: BranchSelection;
  fetchError?: string;
};

type RepositoryFormProps = {
  configuredPaths: string[];
  initial?: ConfiguredRepository;
  onSave: (configured: ConfiguredRepository) => void;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function defaultBaseRef(repository: GitRepository): string {
  const preferences = [
    "refs/remotes/origin/main",
    "refs/remotes/origin/master",
    "refs/heads/main",
    "refs/heads/master",
  ];
  return preferences.find((ref) => repository.branches.some((branch) => branch.ref === ref)) ?? "";
}

function BranchDropdown({
  id,
  title,
  repository,
  value,
  onChange,
}: {
  id: string;
  title: string;
  repository: GitRepository;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Form.Dropdown id={id} title={title} value={value} onChange={onChange}>
      <Form.Dropdown.Item value="" title="Select a branch" />
      <Form.Dropdown.Section title="Remote-tracking branches">
        {repository.branches
          .filter((branch) => branch.kind === "remote")
          .map((branch) => (
            <Form.Dropdown.Item key={branch.ref} value={branch.ref} title={branch.name} />
          ))}
      </Form.Dropdown.Section>
      <Form.Dropdown.Section title="Local branches">
        {repository.branches
          .filter((branch) => branch.kind === "local")
          .map((branch) => (
            <Form.Dropdown.Item key={branch.ref} value={branch.ref} title={branch.name} />
          ))}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}

export function RepositoryForm({ configuredPaths, initial, onSave }: RepositoryFormProps) {
  const { pop } = useNavigation();
  const [repositoryPath, setRepositoryPath] = useState<string[]>(
    initial ? [initial.repository.path] : [],
  );
  const [repository, setRepository] = useState<GitRepository>();
  const [mode, setMode] = useState<"existing" | "new">(
    initial?.selection.newBranchName === undefined ? "existing" : "new",
  );
  const [existingRef, setExistingRef] = useState(
    initial?.selection.newBranchName === undefined ? (initial?.selection.ref ?? "") : "",
  );
  const [baseRef, setBaseRef] = useState(
    initial?.selection.newBranchName !== undefined ? initial.selection.ref : "",
  );
  const [newBranchName, setNewBranchName] = useState(initial?.selection.newBranchName ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [fetchError, setFetchError] = useState<string>();
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const selectedPath = repositoryPath[0];
    if (!selectedPath) {
      setRepository(undefined);
      setLoadError(undefined);
      setFetchError(undefined);
      setLoading(false);
      return;
    }

    setRepository(undefined);
    setLoadError(undefined);
    setFetchError(undefined);
    setLoading(true);

    async function loadAndFetch() {
      try {
        const inspected = await inspectRepository(selectedPath);
        if (configuredPaths.includes(inspected.path)) {
          throw new Error(`${inspected.name} has already been added.`);
        }

        let fetchFailure: string | undefined;
        let refreshed = inspected;
        if (!inspected.remotes.includes("origin")) {
          fetchFailure = "No origin remote is configured.";
        } else {
          try {
            await fetchRemote(inspected.path, "origin");
            refreshed = await inspectRepository(inspected.path);
          } catch (error) {
            fetchFailure = errorMessage(error, "Unable to fetch origin.");
            try {
              refreshed = await inspectRepository(inspected.path);
            } catch {
              refreshed = inspected;
            }
          }
        }

        if (requestId.current !== id) return;
        setRepository(refreshed);
        setFetchError(fetchFailure);

        const initialMatches = initial?.repository.path === refreshed.path;
        const initialRef = initialMatches ? initial.selection.ref : "";
        const stillAvailable = refreshed.branches.some((branch) => branch.ref === initialRef);
        const defaultRef = defaultBaseRef(refreshed);
        if (initialMatches && stillAvailable) {
          if (initial.selection.newBranchName === undefined) setExistingRef(initialRef);
          else setBaseRef(initialRef);
        } else {
          setExistingRef("");
          setBaseRef(defaultRef);
          setNewBranchName("");
        }

        if (fetchFailure) {
          await showToast({
            style: Toast.Style.Failure,
            title: `Fetch failed for ${refreshed.name}`,
            message: `${fetchFailure} Cached branches are still available.`,
          });
        }
      } catch (error) {
        if (requestId.current !== id) return;
        setLoadError(errorMessage(error, "Unable to inspect this repository."));
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }

    void loadAndFetch();
  }, [repositoryPath, configuredPaths, initial]);

  async function handleSave() {
    if (loading || saving) return;
    if (!repository) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a repository",
        message: loadError ?? "Choose a main Git checkout folder.",
      });
      return;
    }

    const ref = mode === "new" ? baseRef : existingRef;
    const target = repository.branches.find((branch) => branch.ref === ref);
    if (!target) {
      await showToast({
        style: Toast.Style.Failure,
        title: mode === "new" ? "Select a base branch" : "Select a branch",
      });
      return;
    }

    setSaving(true);
    try {
      const selection: BranchSelection = { ref };
      if (mode === "new") {
        selection.newBranchName = await validateNewBranchName(repository, newBranchName);
      } else if (
        target.kind === "local" &&
        repository.worktrees.some((worktree) => worktree.branch === target.ref)
      ) {
        const checkout = repository.worktrees.find((worktree) => worktree.branch === target.ref);
        throw new Error(
          `${target.name} is already checked out at ${checkout?.path}. Create a new branch from it instead.`,
        );
      }

      onSave({ repository, selection, fetchError });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: initial ? "Cannot save repository" : "Cannot add repository",
        message: errorMessage(error, "Check the branch selection."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      navigationTitle={initial ? "Edit Repository" : "Add Repository"}
      isLoading={loading || saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={initial ? "Save Repository" : "Add Repository"}
            icon={initial ? Icon.Check : Icon.Plus}
            onSubmit={handleSave}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="repository"
        title="Repository"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={repositoryPath}
        onChange={setRepositoryPath}
        info="Choose the main Git checkout folder. Origin is fetched automatically."
      />
      {loadError && <Form.Description title="Repository Error" text={loadError} />}
      {repository && (
        <>
          <Form.Description
            title="Fetch"
            text={fetchError ? `Failed: ${fetchError}` : "Origin fetched successfully"}
          />
          <Form.Dropdown
            id="branchMode"
            title="Worktree Branch"
            value={mode}
            onChange={(value) => {
              const nextMode = value as "existing" | "new";
              setMode(nextMode);
              if (nextMode === "new" && !baseRef) setBaseRef(defaultBaseRef(repository));
            }}
          >
            <Form.Dropdown.Item value="existing" title="Use an existing branch" />
            <Form.Dropdown.Item value="new" title="Create a new branch" />
          </Form.Dropdown>
          {mode === "existing" ? (
            <BranchDropdown
              id="existingBranch"
              title="Branch"
              repository={repository}
              value={existingRef}
              onChange={setExistingRef}
            />
          ) : (
            <>
              <Form.TextField
                id="newBranchName"
                title="New Branch"
                placeholder="feature/my-feature"
                value={newBranchName}
                onChange={setNewBranchName}
                info="The new branch will not track a remote."
              />
              <BranchDropdown
                id="baseBranch"
                title="Branch Off From"
                repository={repository}
                value={baseRef}
                onChange={setBaseRef}
              />
            </>
          )}
        </>
      )}
    </Form>
  );
}
