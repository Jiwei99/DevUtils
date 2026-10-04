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
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  createGroup,
  PartialGroupError,
  prepareCreatePlan,
  prepareDestination,
} from "./lib/worktree-groups";
import { RepositoryForm, type ConfiguredRepository } from "./worktree-repository-form";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function RepositoryList({
  destinationParent,
  groupName,
  folder,
  onCreated,
}: {
  destinationParent: string;
  groupName: string;
  folder: string;
  onCreated: () => void;
}) {
  const { pop, push } = useNavigation();
  const [configured, setConfigured] = useState<ConfiguredRepository[]>([]);
  const [busy, setBusy] = useState(false);

  function showRepositoryForm(initial?: ConfiguredRepository) {
    push(
      <RepositoryForm
        initial={initial}
        configuredPaths={configured
          .filter((item) => item.repository.path !== initial?.repository.path)
          .map((item) => item.repository.path)}
        onSave={(saved) => {
          setConfigured((current) => {
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

  async function handleCreate() {
    if (busy || configured.length === 0) return;
    setBusy(true);
    try {
      const selections = Object.fromEntries(
        configured.map((item) => [item.repository.path, item.selection]),
      );
      const plan = await prepareCreatePlan(
        configured.map((item) => item.repository.path),
        destinationParent,
        groupName,
        selections,
      );
      const summary = plan.worktrees
        .map(
          (worktree) =>
            `${worktree.sourceName}: ${worktree.target.name} -> ${worktree.checkedOutBranch} (${worktree.mode === "existing" ? "existing branch" : "new branch, no upstream"})`,
        )
        .join("\n");
      const confirmed = await confirmAlert({
        title: `Create ${plan.worktrees.length} worktree${plan.worktrees.length === 1 ? "" : "s"}?`,
        message: `${plan.folder}\n\n${summary}`,
        primaryAction: { title: "Create Worktrees", style: Alert.ActionStyle.Default },
      });
      if (!confirmed) return;

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
        onCreated();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Worktree creation stopped";
        toast.message =
          error instanceof PartialGroupError
            ? `${error.message}\n${error.folder}`
            : errorMessage(error, "Creation failed.");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot create worktrees",
        message: errorMessage(error, "Check the destination and branch selections."),
      });
    } finally {
      setBusy(false);
    }
  }

  function actionsFor(item?: ConfiguredRepository) {
    return (
      <ActionPanel>
        {item && (
          <Action
            title="Edit Repository"
            icon={Icon.Pencil}
            onAction={() => showRepositoryForm(item)}
          />
        )}
        {configured.length > 0 && (
          <Action title="Review and Create Worktrees" icon={Icon.Check} onAction={handleCreate} />
        )}
        <Action title="Add Repository" icon={Icon.Plus} onAction={() => showRepositoryForm()} />
        {item && (
          <Action
            title="Remove Repository"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() =>
              setConfigured((current) =>
                current.filter((candidate) => candidate.repository.path !== item.repository.path),
              )
            }
          />
        )}
      </ActionPanel>
    );
  }

  return (
    <List
      navigationTitle={
        configured.length > 0
          ? `Create Worktree Folder · ${configured.length} ${configured.length === 1 ? "repository" : "repositories"}`
          : "Create Worktree Folder"
      }
      isLoading={busy}
      searchBarPlaceholder="Filter repositories…"
    >
      {configured.length === 0 ? (
        <List.EmptyView
          title="No Repositories Added"
          description={folder}
          icon={Icon.Folder}
          actions={actionsFor()}
        />
      ) : (
        <List.Section
          title="Selected Repositories"
          subtitle={`${configured.length} selected · ${folder}`}
        >
          {configured.map((item) => {
            const target = item.repository.branches.find(
              (branch) => branch.ref === item.selection.ref,
            );
            const branch = item.selection.newBranchName
              ? `${item.selection.newBranchName} from ${target?.name ?? item.selection.ref}`
              : (target?.name ?? item.selection.ref);
            return (
              <List.Item
                key={item.repository.path}
                icon={Icon.Folder}
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
                  { text: branch },
                ]}
                actions={actionsFor(item)}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default function CreateWorktreeGroup() {
  const { push } = useNavigation();
  const [destination, setDestination] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    if (busy) return;
    setBusy(true);
    try {
      const prepared = await prepareDestination(destination[0] ?? "", groupName);
      push(
        <RepositoryList
          destinationParent={destination[0]}
          groupName={groupName.trim()}
          folder={prepared.folder}
          onCreated={() => {
            setDestination([]);
            setGroupName("");
          }}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot use destination",
        message: errorMessage(error, "Choose a writable destination folder."),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      navigationTitle="Choose Destination"
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Select Repositories"
            icon={Icon.ArrowRight}
            onSubmit={handleContinue}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="destination"
        title="Destination"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={destination}
        onChange={setDestination}
        info="The new worktree folder will be stored here."
      />
      <Form.TextField
        id="groupName"
        title="New Folder Name"
        placeholder="Optional"
        value={groupName}
        onChange={setGroupName}
        info="Leave empty to store the worktrees directly in the selected destination."
      />
    </Form>
  );
}
