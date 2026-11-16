import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { confirmAndRunCacheClean } from "./lib/cache-cleaning";

export default function ClearGoCache() {
  const [buildCache, setBuildCache] = useState(true);
  const [testCache, setTestCache] = useState(true);
  const [fuzzCache, setFuzzCache] = useState(false);
  const [moduleCache, setModuleCache] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClear() {
    if (busy) return;

    const selected = [
      buildCache ? { flag: "-cache", label: "build outputs" } : undefined,
      testCache ? { flag: "-testcache", label: "test results" } : undefined,
      fuzzCache ? { flag: "-fuzzcache", label: "fuzzing values" } : undefined,
      moduleCache ? { flag: "-modcache", label: "downloaded modules" } : undefined,
    ].filter((item): item is { flag: string; label: string } => item !== undefined);

    if (selected.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one Go cache",
      });
      return;
    }

    setBusy(true);
    try {
      await confirmAndRunCacheClean({
        commands: ["go"],
        args: ["clean", ...selected.map((item) => item.flag)],
        confirmationTitle: `Clear ${selected.length} Go cache${selected.length === 1 ? "" : "s"}?`,
        confirmationMessage: `This removes ${selected.map((item) => item.label).join(", ")}. Source code and installed Go versions are preserved. Cleared modules and build outputs will be downloaded or rebuilt when needed.\n\nCommand: go clean ${selected.map((item) => item.flag).join(" ")}`,
        actionTitle: "Clear Selected Caches",
        runningTitle: "Clearing Go caches",
        runningMessage: selected.map((item) => item.label).join(", "),
        successTitle: "Go caches cleared",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      navigationTitle="Clear Go Caches"
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
      <Form.Description
        title="Recommended"
        text="Build and test caches are selected by default. Module and fuzz caches are optional because clearing them has a larger performance cost."
      />
      <Form.Checkbox
        id="buildCache"
        label="Build cache · compiled package outputs"
        value={buildCache}
        onChange={setBuildCache}
      />
      <Form.Checkbox
        id="testCache"
        label="Test cache · cached successful test results"
        value={testCache}
        onChange={setTestCache}
      />
      <Form.Checkbox
        id="fuzzCache"
        label="Fuzz cache · values that expanded fuzz coverage"
        value={fuzzCache}
        onChange={setFuzzCache}
      />
      <Form.Checkbox
        id="moduleCache"
        label="Module cache · downloaded dependency source"
        value={moduleCache}
        onChange={setModuleCache}
      />
    </Form>
  );
}
