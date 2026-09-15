import { Action, ActionPanel, Alert, Form, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { inspectGroup, removeGroup, type GroupInspection } from "./lib/worktree-groups";

export default function RemoveWorktreeGroup() {
  const [folder, setFolder] = useState<string[]>([]);
  const [inspection, setInspection] = useState<GroupInspection>();
  const [inspectionError, setInspectionError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

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
        if (!cancelled)
          setInspectionError(
            error instanceof Error ? error.message : "Unable to inspect this folder.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  async function handleRemove() {
    if (loading || busy) return;
    try {
      const fresh = await inspectGroup(folder[0] ?? "");
      if (fresh.issues.length) {
        throw new Error(`Removal blocked. Resolve these first: ${fresh.issues.join("; ")}`);
      }

      const confirmed = await confirmAlert({
        title: `Remove ${fresh.worktrees.length} worktree${fresh.worktrees.length === 1 ? "" : "s"} and folder?`,
        message: `${fresh.folder}\n\n${fresh.worktrees
          .map((worktree) => `${worktree.path} (${worktree.branch ?? "detached"})`)
          .join("\n")}\n\nGit branches and source repositories will remain.`,
        primaryAction: { title: "Remove Worktree Group", style: Alert.ActionStyle.Destructive },
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
        toast.title = `Removed ${count} worktree${count === 1 ? "" : "s"} and folder`;
        toast.message = fresh.folder;
        setFolder([]);
        setInspection(undefined);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Worktree removal stopped";
        toast.message =
          error instanceof Error
            ? error.message
            : "Removal failed; inspect the folder before retrying.";
        setInspection(undefined);
      } finally {
        setBusy(false);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove worktree group",
        message:
          error instanceof Error
            ? error.message
            : "Choose a folder containing only linked worktrees.",
      });
    }
  }

  return (
    <Form
      navigationTitle="Remove Worktree Group"
      isLoading={loading || busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Review and Remove Worktrees" onSubmit={handleRemove} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="groupFolder"
        title="Worktree Group"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={folder}
        onChange={setFolder}
        info="Choose the enclosing folder containing linked worktrees."
      />
      <Form.Description text="Only linked worktrees are eligible. Source repositories, main checkouts, and Git branches will not be deleted." />
      {inspectionError && <Form.Description title="Folder Error" text={inspectionError} />}
      {inspection && (
        <>
          <Form.Separator />
          <Form.Description title="Folder" text={inspection.folder} />
          {inspection.worktrees.map((worktree) => (
            <Form.Description
              key={worktree.path}
              title={worktree.path.split(/[\\/]/).pop() ?? worktree.path}
              text={`${worktree.branch ?? "detached HEAD"} · ${worktree.issues.length ? `Blocked: ${worktree.issues.join(", ")}` : "Clean and eligible"}`}
            />
          ))}
          {inspection.issues.length > 0 && (
            <Form.Description title="Removal Blocked" text={inspection.issues.join("; ")} />
          )}
          {inspection.worktrees.length === 0 && (
            <Form.Description text="This DevUtils group is empty and can be removed." />
          )}
        </>
      )}
    </Form>
  );
}
