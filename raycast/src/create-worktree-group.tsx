import { Action, ActionPanel, Alert, Form, Toast, confirmAlert, showToast } from "@raycast/api";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { fetchRemote, inspectRepository, type GitRepository } from "./lib/git-worktrees";
import {
  createGroup,
  PartialGroupError,
  prepareCreatePlan,
  type BranchSelection,
} from "./lib/worktree-groups";

export default function CreateWorktreeGroup() {
  const [repositoryPaths, setRepositoryPaths] = useState<string[]>([]);
  const repositoryPathsRef = useRef(repositoryPaths);
  const [destination, setDestination] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [repositories, setRepositories] = useState<GitRepository[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<Record<string, string>>({});
  const [sharedRef, setSharedRef] = useState("");
  const [sharedNewBranchName, setSharedNewBranchName] = useState("");
  const [individualNewBranches, setIndividualNewBranches] = useState<Record<string, boolean>>({});
  const [individualBranchNames, setIndividualBranchNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [fetchResult, setFetchResult] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    if (repositoryPaths.length === 0) {
      setRepositories([]);
      setLoadError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(undefined);
    Promise.all(repositoryPaths.map(inspectRepository))
      .then((results) => {
        if (!cancelled) setRepositories(results);
      })
      .catch((error) => {
        if (!cancelled) {
          setRepositories([]);
          setLoadError(error instanceof Error ? error.message : "Unable to inspect repositories.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repositoryPaths]);

  const commonBranches = useMemo(() => {
    if (repositories.length < 2) return [];
    const otherRefs = repositories
      .slice(1)
      .map((repository) => new Set(repository.branches.map((branch) => branch.ref)));
    return repositories[0].branches.filter((branch) =>
      otherRefs.every((refs) => refs.has(branch.ref)),
    );
  }, [repositories]);

  async function handleFetchRemotes() {
    if (busy || loading) return;

    try {
      const selectedPaths = [...repositoryPaths];
      const currentRepositories = await Promise.all(selectedPaths.map(inspectRepository));
      const targets = currentRepositories.flatMap((repository) =>
        repository.remotes.map((remote) => ({ repository, remote })),
      );
      if (targets.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No configured remotes",
          message: "Select a repository with at least one Git remote.",
        });
        return;
      }

      const confirmed = await confirmAlert({
        title: `Fetch ${targets.length} remote${targets.length === 1 ? "" : "s"}?`,
        message: `${currentRepositories
          .filter((repository) => repository.remotes.length > 0)
          .map((repository) => `${repository.path}: ${repository.remotes.join(", ")}`)
          .join(
            "\n",
          )}\n\nThis contacts the configured Git remotes and updates local remote-tracking refs. It does not create worktrees or push changes.`,
        primaryAction: { title: "Fetch Remote Branches", style: Alert.ActionStyle.Default },
      });
      if (!confirmed) return;

      setBusy(true);
      setFetchResult(undefined);
      try {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Fetching remote branches",
          message: `0 of ${targets.length} remotes finished`,
        });
        const failures: string[] = [];
        let fetched = 0;
        try {
          for (const [index, { repository, remote }] of targets.entries()) {
            toast.message = `${repository.name}: ${remote} (${index + 1} of ${targets.length})`;
            try {
              await fetchRemote(repository.path, remote);
              fetched++;
            } catch (error) {
              failures.push(
                `${repository.name}/${remote}: ${error instanceof Error ? error.message : "Fetch failed."}`,
              );
            }
          }

          const refreshed = await Promise.all(selectedPaths.map(inspectRepository));
          if (repositoryPathsRef.current.join("\0") !== selectedPaths.join("\0")) {
            toast.style = Toast.Style.Success;
            toast.title = "Fetch finished";
            toast.message =
              "The repository selection changed; its branch list was not overwritten.";
            return;
          }
          setRepositories(refreshed);
          setLoadError(undefined);
          setSelectedRefs((current) =>
            Object.fromEntries(
              refreshed.flatMap((repository) => {
                const ref = current[repository.path];
                return repository.branches.some((branch) => branch.ref === ref)
                  ? [[repository.path, ref]]
                  : [];
              }),
            ),
          );
          setSharedRef((current) =>
            current &&
            refreshed.every((repository) =>
              repository.branches.some((branch) => branch.ref === current),
            )
              ? current
              : "",
          );

          const result =
            failures.length === 0
              ? `Fetched ${fetched} remote${fetched === 1 ? "" : "s"}. Branch options are refreshed.`
              : `Fetched ${fetched} of ${targets.length} remotes. Failed: ${failures.join("; ")}`;
          setFetchResult(result);
          toast.style = failures.length === 0 ? Toast.Style.Success : Toast.Style.Failure;
          toast.title = failures.length === 0 ? "Remote branches refreshed" : "Some fetches failed";
          toast.message = result;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to refresh branches.";
          if (repositoryPathsRef.current.join("\0") === selectedPaths.join("\0")) {
            setRepositories([]);
            setLoadError(message);
            setFetchResult(`Fetched ${fetched} remotes, but branch refresh failed: ${message}`);
          }
          toast.style = Toast.Style.Failure;
          toast.title = "Could not refresh branch options";
          toast.message = message;
        }
      } finally {
        setBusy(false);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot fetch remotes",
        message: error instanceof Error ? error.message : "Check the selected repositories.",
      });
    }
  }

  async function handleCreate() {
    if (busy || loading) return;
    if (loadError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid repository selection",
        message: loadError,
      });
      return;
    }

    try {
      const selections: Record<string, BranchSelection> = Object.fromEntries(
        repositories.map((repository) => [
          repository.path,
          {
            ref: selectedRefs[repository.path] ?? "",
            newBranchName:
              sharedNewBranchName.length > 0
                ? sharedNewBranchName
                : individualNewBranches[repository.path]
                  ? (individualBranchNames[repository.path] ?? "")
                  : undefined,
          },
        ]),
      );
      const plan = await prepareCreatePlan(
        repositoryPaths,
        destination[0] ?? "",
        groupName,
        selections,
      );
      const summary = plan.worktrees
        .map(
          (worktree) =>
            `${worktree.sourceName}: ${worktree.target.name} → ${worktree.checkedOutBranch} (${worktree.mode === "existing" ? "existing branch" : "new branch, no upstream"})`,
        )
        .join("\n");
      const confirmed = await confirmAlert({
        title: `Create ${plan.worktrees.length} worktree${plan.worktrees.length === 1 ? "" : "s"}?`,
        message: `${plan.folder}\n\n${summary}\n\nFor the latest remote main/master, fetch first and select its remote-tracking ref. Creation will not pull or set an upstream on new branches.`,
        primaryAction: { title: "Create Worktree Group", style: Alert.ActionStyle.Default },
      });
      if (!confirmed) return;

      setBusy(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating worktrees",
        message: plan.folder,
      });
      try {
        const count = await createGroup(plan, (completed) => {
          toast.message = `${completed} of ${plan.worktrees.length} created`;
        });
        toast.style = Toast.Style.Success;
        toast.title = `Created ${count} worktree${count === 1 ? "" : "s"}`;
        toast.message = plan.folder;
        setGroupName("");
        setSharedNewBranchName("");
        setIndividualNewBranches({});
        setIndividualBranchNames({});
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Worktree creation stopped";
        toast.message =
          error instanceof PartialGroupError
            ? `${error.message}\n${error.folder}`
            : error instanceof Error
              ? error.message
              : "Creation failed.";
      } finally {
        setBusy(false);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot create worktree group",
        message:
          error instanceof Error
            ? error.message
            : "Please check the selected folders and branches.",
      });
    }
  }

  return (
    <Form
      navigationTitle="Create Worktree Group"
      isLoading={loading || busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Review and Create Worktrees" onSubmit={handleCreate} />
          <Action title="Fetch Remote Branches" onAction={handleFetchRemotes} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="repositories"
        title="Repositories"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
        value={repositoryPaths}
        onChange={(paths) => {
          repositoryPathsRef.current = paths;
          setRepositoryPaths(paths);
          setSelectedRefs({});
          setSharedRef("");
          setSharedNewBranchName("");
          setIndividualNewBranches({});
          setIndividualBranchNames({});
          setFetchResult(undefined);
        }}
        info="Choose one or more main Git checkout folders, not linked worktrees or subfolders."
      />
      <Form.FilePicker
        id="destination"
        title="Destination Parent"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={destination}
        onChange={setDestination}
        info="A new worktree group folder will be created inside this directory."
      />
      <Form.TextField
        id="groupName"
        title="New Group Folder"
        placeholder="feature-worktrees"
        value={groupName}
        onChange={setGroupName}
        info="The enclosing folder does not already exist."
      />
      <Form.TextField
        id="sharedNewBranchName"
        title="New Branch for All"
        placeholder="feature/my-feature (optional)"
        value={sharedNewBranchName}
        onChange={setSharedNewBranchName}
        info="If set, create this same new branch in every repository from its selected target. Leave empty to choose per repository."
      />
      {loadError && <Form.Description title="Repository Error" text={loadError} />}
      {fetchResult && <Form.Description title="Fetch Result" text={fetchResult} />}
      {repositories.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description text="Choose a target branch for each repository. An existing local branch must not already be checked out; a new branch may start from one that is. New branches have no upstream." />
          <Form.Description text="For the latest base, fetch first, then choose origin/main, origin/master, or the corresponding ref from another remote. Choosing local main/master may use an older commit." />
          <Form.Description text="Open this form's action menu and choose Fetch Remote Branches to contact the configured Git remotes and refresh these choices." />
          <Form.Description
            title="Configured Remotes"
            text={repositories
              .map((repository) => `${repository.name}: ${repository.remotes.join(", ") || "none"}`)
              .join("\n")}
          />
          {commonBranches.length > 0 && (
            <Form.Dropdown
              id="commonBranch"
              title="Apply to All"
              value={sharedRef}
              onChange={(ref) => {
                setSharedRef(ref);
                if (ref)
                  setSelectedRefs(
                    Object.fromEntries(repositories.map((repository) => [repository.path, ref])),
                  );
              }}
            >
              <Form.Dropdown.Item value="" title="Choose branches individually" />
              <Form.Dropdown.Section title="Local branches in every repository">
                {commonBranches
                  .filter((branch) => branch.kind === "local")
                  .map((branch) => (
                    <Form.Dropdown.Item key={branch.ref} value={branch.ref} title={branch.name} />
                  ))}
              </Form.Dropdown.Section>
              <Form.Dropdown.Section title="Remote-tracking branches in every repository">
                {commonBranches
                  .filter((branch) => branch.kind === "remote")
                  .map((branch) => (
                    <Form.Dropdown.Item key={branch.ref} value={branch.ref} title={branch.name} />
                  ))}
              </Form.Dropdown.Section>
            </Form.Dropdown>
          )}
          {repositories.map((repository, index) => (
            <Fragment key={repository.path}>
              <Form.Dropdown
                id={`targetBranch${index}`}
                title={`${repository.name} Target`}
                value={selectedRefs[repository.path] ?? ""}
                onChange={(ref) => {
                  setSharedRef("");
                  setSelectedRefs((current) => ({ ...current, [repository.path]: ref }));
                }}
                info={repository.path}
              >
                <Form.Dropdown.Item value="" title="Select a target branch" />
                <Form.Dropdown.Section title="Local branches">
                  {repository.branches
                    .filter((branch) => branch.kind === "local")
                    .map((branch) => (
                      <Form.Dropdown.Item key={branch.ref} value={branch.ref} title={branch.name} />
                    ))}
                </Form.Dropdown.Section>
                <Form.Dropdown.Section title="Remote-tracking branches (offline)">
                  {repository.branches
                    .filter((branch) => branch.kind === "remote")
                    .map((branch) => (
                      <Form.Dropdown.Item key={branch.ref} value={branch.ref} title={branch.name} />
                    ))}
                </Form.Dropdown.Section>
              </Form.Dropdown>
              {sharedNewBranchName.length === 0 && (
                <Form.Checkbox
                  id={`createBranch${index}`}
                  title={`${repository.name} New Branch`}
                  label="Create a new branch from this target"
                  value={individualNewBranches[repository.path] ?? false}
                  onChange={(enabled) =>
                    setIndividualNewBranches((current) => ({
                      ...current,
                      [repository.path]: enabled,
                    }))
                  }
                />
              )}
              {sharedNewBranchName.length === 0 && individualNewBranches[repository.path] && (
                <Form.TextField
                  id={`newBranchName${index}`}
                  title={`${repository.name} Branch Name`}
                  placeholder="feature/my-feature"
                  value={individualBranchNames[repository.path] ?? ""}
                  onChange={(name) =>
                    setIndividualBranchNames((current) => ({
                      ...current,
                      [repository.path]: name,
                    }))
                  }
                />
              )}
            </Fragment>
          ))}
        </>
      )}
    </Form>
  );
}
