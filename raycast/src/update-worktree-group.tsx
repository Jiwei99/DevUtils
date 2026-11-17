import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";
import {
  inspectManagedGroup,
  PartialGroupError,
  prepareUpdatePlan,
  updateGroup,
  type InspectedWorktree,
  type ManagedGroupInspection,
} from "./lib/worktree-groups";
import { RepositoryForm, type ConfiguredRepository } from "./worktree-repository-form";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function WorktreeGroupEditor({ initialGroup }: { initialGroup: ManagedGroupInspection }) {
  const { push } = useNavigation();
  const [group, setGroup] = useState(initialGroup);
  const [additions, setAdditions] = useState<ConfiguredRepository[]>([]);
  const [removalPaths, setRemovalPaths] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function showRepositoryForm(initial?: ConfiguredRepository) {
    const existingSources = group.worktrees.map((worktree) => worktree.source);
    push(
      <RepositoryForm
        initial={initial}
        configuredPaths={[
          ...existingSources,
          ...additions
            .filter((item) => item.repository.path !== initial?.repository.path)
            .map((item) => item.repository.path),
        ]}
        onSave={(saved) => {
          setAdditions((current) => {
            const index = current.findIndex(
              (item) => item.repository.path === initial?.repository.path,
            );
            if (index === -1) return [...current, saved];
            return current.map((item, itemIndex) => (itemIndex === index ? saved : item));
          });
        }}
      />,
    );
  }

  async function toggleRemoval(worktree: InspectedWorktree) {
    if (!removalPaths.has(worktree.path) && worktree.issues.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Cannot remove ${path.basename(worktree.path)}`,
        message: worktree.issues.join("; "),
      });
      return;
    }
    setRemovalPaths((current) => {
      const next = new Set(current);
      if (next.has(worktree.path)) next.delete(worktree.path);
      else next.add(worktree.path);
      return next;
    });
  }

  async function refreshGroup() {
    const refreshed = await inspectManagedGroup(group.folder);
    setGroup(refreshed);
    setAdditions([]);
    setRemovalPaths(new Set());
  }

  async function handleUpdate() {
    if (busy || (additions.length === 0 && removalPaths.size === 0)) return;
    setBusy(true);
    try {
      const plan = await prepareUpdatePlan(
        group.folder,
        additions.map((item) => item.repository.path),
        Object.fromEntries(additions.map((item) => [item.repository.path, item.selection])),
        [...removalPaths],
      );
      const addSummary = plan.additions.map(
        (worktree) =>
          `+ ${worktree.sourceName}: ${worktree.target.name} -> ${worktree.checkedOutBranch}`,
      );
      const removeSummary = plan.removals.map(
        (worktree) => `− ${path.basename(worktree.path)} (${worktree.branch ?? "detached"})`,
      );
      const total = plan.additions.length + plan.removals.length;
      const confirmed = await confirmAlert({
        title: `Apply ${total} folder change${total === 1 ? "" : "s"}?`,
        message: `${plan.folder}\n\n${[...addSummary, ...removeSummary].join("\n")}\n\nRemoved worktrees must remain clean. Git branches and source repositories are preserved.`,
        primaryAction: {
          title: "Update Worktree Folder",
          style:
            plan.removals.length > 0 ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });
      if (!confirmed) return;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating worktree folder",
        message: plan.folder,
      });
      try {
        const result = await updateGroup(plan, ({ completed, total: progressTotal, phase }) => {
          toast.message = `${phase === "adding" ? "Adding" : "Removing"} · ${completed} of ${progressTotal}`;
        });
        toast.style = Toast.Style.Success;
        toast.title = "Worktree folder updated";
        toast.message = `${result.added} added · ${result.removed} removed`;
        const { workspacePath } = result;
        if (workspacePath) {
          toast.primaryAction = {
            title: "Open Workspace",
            onAction: () => void open(workspacePath),
          };
        }
        await refreshGroup();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Worktree folder update stopped";
        toast.message =
          error instanceof PartialGroupError
            ? `${error.message}\n${error.folder}`
            : errorMessage(error, "Update failed.");
        try {
          await refreshGroup();
        } catch {
          // Keep the reviewed state visible when refresh fails.
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot update worktree folder",
        message: errorMessage(error, "Review the selected changes."),
      });
    } finally {
      setBusy(false);
    }
  }

  function reviewAction() {
    if (additions.length === 0 && removalPaths.size === 0) return null;
    return <Action title="Review and Update Folder" icon={Icon.Check} onAction={handleUpdate} />;
  }

  function actionsForWorktree(worktree: InspectedWorktree) {
    const pendingRemoval = removalPaths.has(worktree.path);
    return (
      <ActionPanel>
        <Action.ShowInFinder path={worktree.path} />
        {reviewAction()}
        <Action
          title={pendingRemoval ? "Keep Worktree" : "Mark Worktree for Removal"}
          icon={pendingRemoval ? Icon.ArrowCounterClockwise : Icon.Trash}
          style={pendingRemoval ? Action.Style.Regular : Action.Style.Destructive}
          onAction={() => void toggleRemoval(worktree)}
        />
        <Action title="Add Repository" icon={Icon.Plus} onAction={() => showRepositoryForm()} />
      </ActionPanel>
    );
  }

  function actionsForAddition(item: ConfiguredRepository) {
    return (
      <ActionPanel>
        <Action
          title="Edit Repository"
          icon={Icon.Pencil}
          onAction={() => showRepositoryForm(item)}
        />
        {reviewAction()}
        <Action title="Add Repository" icon={Icon.Plus} onAction={() => showRepositoryForm()} />
        <Action
          title="Remove Pending Addition"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() =>
            setAdditions((current) =>
              current.filter((candidate) => candidate.repository.path !== item.repository.path),
            )
          }
        />
      </ActionPanel>
    );
  }

  const empty = group.worktrees.length === 0 && additions.length === 0;
  const pendingChanges = additions.length + removalPaths.size;
  return (
    <List
      navigationTitle={
        pendingChanges > 0
          ? `Update Worktree Folder · +${additions.length} −${removalPaths.size}`
          : "Update Worktree Folder"
      }
      isLoading={busy}
      searchBarPlaceholder="Filter repositories…"
    >
      {empty ? (
        <List.EmptyView
          title="No Worktrees in This Folder"
          description="Add a repository to create the first worktree."
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Add Repository"
                icon={Icon.Plus}
                onAction={() => showRepositoryForm()}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {group.worktrees.length > 0 && (
            <List.Section
              title={`Current Worktrees · ${group.worktrees.length}`}
              subtitle={group.folder}
            >
              {group.worktrees.map((worktree) => {
                const pendingRemoval = removalPaths.has(worktree.path);
                return (
                  <List.Item
                    key={worktree.path}
                    icon={Icon.Folder}
                    title={path.basename(worktree.path)}
                    subtitle={{ value: worktree.source, tooltip: worktree.source }}
                    accessories={[
                      ...(worktree.issues.length > 0
                        ? [
                            {
                              tag: { value: "Local changes", color: Color.Orange },
                              tooltip: worktree.issues.join("; "),
                            },
                          ]
                        : []),
                      ...(pendingRemoval ? [{ tag: { value: "Remove", color: Color.Red } }] : []),
                      { text: worktree.branch ?? "detached" },
                    ]}
                    actions={actionsForWorktree(worktree)}
                  />
                );
              })}
            </List.Section>
          )}
          {additions.length > 0 && (
            <List.Section title="Repositories to Add">
              {additions.map((item) => {
                const target = item.repository.branches.find(
                  (branch) => branch.ref === item.selection.ref,
                );
                const branch = item.selection.newBranchName
                  ? `${item.selection.newBranchName} from ${target?.name ?? item.selection.ref}`
                  : (target?.name ?? item.selection.ref);
                return (
                  <List.Item
                    key={item.repository.path}
                    icon={Icon.PlusCircle}
                    title={item.repository.name}
                    subtitle={{ value: item.repository.path, tooltip: item.repository.path }}
                    accessories={[
                      ...(item.fetchError
                        ? [
                            {
                              tag: { value: "Fetch failed", color: Color.Red },
                              tooltip: item.fetchError,
                            },
                          ]
                        : []),
                      { tag: { value: "Add", color: Color.Green } },
                      { text: branch },
                    ]}
                    actions={actionsForAddition(item)}
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

export default function UpdateWorktreeGroup() {
  const { push } = useNavigation();
  const [folder, setFolder] = useState<string[]>([]);
  const [inspection, setInspection] = useState<ManagedGroupInspection>();
  const [inspectionError, setInspectionError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!folder[0]) {
      setInspection(undefined);
      setInspectionError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setInspection(undefined);
    setInspectionError(undefined);
    inspectManagedGroup(folder[0])
      .then((result) => {
        if (!cancelled) setInspection(result);
      })
      .catch((error) => {
        if (!cancelled) {
          setInspectionError(errorMessage(error, "Unable to inspect this worktree folder."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  async function handleContinue() {
    if (loading) return;
    if (!inspection) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a worktree folder",
        message:
          inspectionError ?? "Select a DevUtils worktree folder or a folder of linked worktrees.",
      });
      return;
    }
    push(<WorktreeGroupEditor initialGroup={inspection} />);
  }

  return (
    <Form
      navigationTitle="Choose Worktree Folder"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Manage Worktrees"
            icon={Icon.ArrowRight}
            onSubmit={() => void handleContinue()}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="groupFolder"
        title="Worktree Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={folder}
        onChange={setFolder}
        info="Choose a DevUtils worktree folder or a folder containing linked Git worktrees."
      />
      {inspectionError && <Form.Description title="Folder Error" text={inspectionError} />}
      {inspection && (
        <>
          <Form.Description title="Folder" text={inspection.folder} />
          <Form.Description
            title="Worktrees"
            text={`${inspection.worktrees.length} linked worktree${inspection.worktrees.length === 1 ? "" : "s"}`}
          />
          {inspection.issues.length > 0 && (
            <Form.Description
              title="Local Changes"
              text="Worktrees with local changes can remain in the folder, but cannot be removed until they are clean."
            />
          )}
        </>
      )}
    </Form>
  );
}
