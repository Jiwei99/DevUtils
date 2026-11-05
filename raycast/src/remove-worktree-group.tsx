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
import path from "node:path";
import { useEffect, useState } from "react";
import { inspectGroup, removeGroup, type GroupInspection } from "./lib/worktree-groups";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function RemovalReview({
  initialInspection,
  onRemoved,
}: {
  initialInspection: GroupInspection;
  onRemoved: () => void;
}) {
  const { pop } = useNavigation();
  const [inspection, setInspection] = useState(initialInspection);
  const [busy, setBusy] = useState(false);
  const blocked = inspection.issues.length > 0;

  async function handleRemove() {
    if (busy) return;
    try {
      const fresh = await inspectGroup(inspection.folder);
      setInspection(fresh);
      if (fresh.issues.length) {
        throw new Error(`Removal blocked. Resolve these first: ${fresh.issues.join("; ")}`);
      }

      const confirmed = await confirmAlert({
        title: `Remove ${fresh.worktrees.length} worktree${fresh.worktrees.length === 1 ? "" : "s"}${fresh.removeFolder ? " and folder" : ""}?`,
        message: `${fresh.folder}\n\n${fresh.worktrees
          .map((worktree) => `${worktree.path} (${worktree.branch ?? "detached"})`)
          .join(
            "\n",
          )}${fresh.junk.length ? `\n\nAlso deletes: ${fresh.junk.join(", ")}` : ""}\n\nGit branches and source repositories will remain.${fresh.removeFolder ? "" : " The selected destination folder and any unrelated contents will remain."}`,
        primaryAction: {
          title: fresh.removeFolder ? "Remove Worktrees and Folder" : "Remove Worktrees",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;

      setBusy(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing worktrees",
        message: fresh.folder,
      });
      try {
        const count = await removeGroup(fresh, (completed) => {
          toast.message = `${completed} of ${fresh.worktrees.length} removed`;
        });
        toast.style = Toast.Style.Success;
        toast.title = `Removed ${count} worktree${count === 1 ? "" : "s"}${fresh.removeFolder ? " and folder" : ""}`;
        toast.message = fresh.folder;
        onRemoved();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Worktree removal stopped";
        toast.message = errorMessage(error, "Removal failed; inspect the folder before retrying.");
        try {
          setInspection(await inspectGroup(fresh.folder));
        } catch {
          // Keep the reviewed state visible when the folder can no longer be inspected.
        }
      } finally {
        setBusy(false);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove worktree folder",
        message: errorMessage(error, "Choose a folder containing linked worktrees."),
      });
    }
  }

  function actionsFor(worktreePath?: string) {
    return (
      <ActionPanel>
        <Action.ShowInFinder path={worktreePath ?? inspection.folder} />
        <Action
          title="Remove All Worktrees"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => void handleRemove()}
        />
      </ActionPanel>
    );
  }

  return (
    <List
      navigationTitle={`Remove Worktree Folder · ${inspection.worktrees.length} ${inspection.worktrees.length === 1 ? "worktree" : "worktrees"}`}
      isLoading={busy}
      searchBarPlaceholder="Filter worktrees…"
    >
      {inspection.worktrees.length === 0 ? (
        <List.EmptyView
          title="Empty Worktree Folder"
          description={
            inspection.removeFolder
              ? "The empty worktree folder can be removed."
              : "The DevUtils manifest can be removed while preserving this folder."
          }
          icon={Icon.Folder}
          actions={actionsFor()}
        />
      ) : (
        <List.Section
          title="Worktrees to Remove"
          subtitle={
            blocked ? `${inspection.issues.length} blocking issues` : "All worktrees are clean"
          }
        >
          {inspection.worktrees.map((worktree) => (
            <List.Item
              key={worktree.path}
              icon={Icon.Folder}
              title={path.basename(worktree.path)}
              subtitle={{ value: worktree.source, tooltip: worktree.source }}
              accessories={[
                ...(worktree.issues.length > 0
                  ? [
                      {
                        tag: { value: "Blocked", color: Color.Red },
                        tooltip: worktree.issues.join("; "),
                      },
                    ]
                  : [{ tag: { value: "Remove", color: Color.Red } }]),
                { text: worktree.branch ?? "detached" },
              ]}
              actions={actionsFor(worktree.path)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function RemoveWorktreeGroup() {
  const { push } = useNavigation();
  const [folder, setFolder] = useState<string[]>([]);
  const [inspection, setInspection] = useState<GroupInspection>();
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
    inspectGroup(folder[0])
      .then((result) => {
        if (!cancelled) setInspection(result);
      })
      .catch((error) => {
        if (!cancelled) setInspectionError(errorMessage(error, "Unable to inspect this folder."));
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
        message: inspectionError ?? "Select a folder containing linked worktrees.",
      });
      return;
    }
    push(
      <RemovalReview
        initialInspection={inspection}
        onRemoved={() => {
          setFolder([]);
          setInspection(undefined);
        }}
      />,
    );
  }

  return (
    <Form
      navigationTitle="Choose Worktree Folder"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review Worktrees"
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
        info="Choose the enclosing folder containing linked worktrees."
      />
      <Form.Description text="Source repositories, main checkouts, and Git branches are preserved." />
      {inspectionError && <Form.Description title="Folder Error" text={inspectionError} />}
      {inspection && (
        <>
          <Form.Separator />
          <Form.Description title="Folder" text={inspection.folder} />
          <Form.Description
            title="Removal Summary"
            text={`${inspection.worktrees.length} worktree${inspection.worktrees.length === 1 ? "" : "s"} · ${inspection.issues.length} blocking issue${inspection.issues.length === 1 ? "" : "s"}`}
          />
        </>
      )}
    </Form>
  );
}
