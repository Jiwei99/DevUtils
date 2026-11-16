import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { access } from "node:fs/promises";
import path from "node:path";
import { useState } from "react";
import { confirmAndRunCacheCleanBatch } from "./lib/cache-cleaning";

export default function ClearRustCache() {
  const [projectFolder, setProjectFolder] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleClear() {
    if (busy) return;
    const folders = [...new Set(projectFolder.map((folder) => path.resolve(folder)))];
    if (folders.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Choose at least one Cargo project" });
      return;
    }

    const manifests = folders.map((folder) => ({
      folder,
      manifest: path.join(folder, "Cargo.toml"),
    }));
    const manifestChecks = await Promise.all(
      manifests.map(async (project) => {
        try {
          await access(project.manifest);
          return undefined;
        } catch {
          return project.folder;
        }
      }),
    );
    const missingManifests = manifestChecks.filter(
      (folder): folder is string => folder !== undefined,
    );
    if (missingManifests.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Cargo.toml not found in ${missingManifests.length} selection${missingManifests.length === 1 ? "" : "s"}`,
        message: missingManifests.slice(0, 2).join(", "),
      });
      return;
    }

    setBusy(true);
    try {
      await confirmAndRunCacheCleanBatch({
        commands: ["cargo"],
        items: manifests.map(({ folder, manifest }) => ({
          args: ["clean", "--manifest-path", manifest],
          cwd: folder,
          label: path.basename(folder),
        })),
        confirmationTitle: `Clear ${folders.length} Cargo build cache${folders.length === 1 ? "" : "s"}?`,
        confirmationMessage: `This removes generated build artifacts for:\n\n${folders.map((folder) => `• ${folder}`).join("\n")}\n\nSource code, installed toolchains, and Cargo's global dependency cache are preserved. The next build will recompile dependencies.`,
        actionTitle: "Clear Selected Build Caches",
        runningTitle: "Clearing Cargo build caches",
        successTitle: "Cargo build caches cleared",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      navigationTitle="Clear Rust Build Caches"
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review and Clear Selected Caches"
            icon={Icon.Trash}
            onSubmit={() => void handleClear()}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="projectFolder"
        title="Cargo Projects"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
        value={projectFolder}
        onChange={setProjectFolder}
        info="Choose one or more folders containing Cargo.toml. Each package or workspace is cleaned in turn."
      />
      <Form.Description
        title="Global Cargo cache"
        text="Cargo automatically removes old registry and Git dependency cache entries. This command only clears project build artifacts."
      />
    </Form>
  );
}
