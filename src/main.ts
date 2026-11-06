import { createImportController, type ImportController } from "./data/importController";
import { memoryHandleStore } from "./data/fileHandleStore";
import { mountGantt } from "./ui/mount";

/** Phase 5 checks keyboard access and builds one self-contained HTML file. */
export const SCAFFOLD_PHASE = 5;

type PickerHost = typeof globalThis & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemFileHandle[]>;
};

export type BootOptions = { managed?: boolean };

/** Managed mode reuses the approved v18 viewer without enabling writes in its regular entrypoint. */
export function boot(doc: Document = document, options: BootOptions = {}): ImportController | null {
  if (!doc.getElementById("gantt")) return null;
  const fileInput = doc.getElementById("file");
  if (!(fileInput instanceof HTMLInputElement)) return null;
  const paletteStorage = typeof sessionStorage === "undefined" ? null : sessionStorage;
  const controller = createImportController({
    showOpenFilePicker: options.managed ? undefined : picker(globalThis as PickerHost),
    store: options.managed ? memoryHandleStore() : undefined,
    allowedHosts: options.managed ? [] : undefined,
    paletteStorage,
  });
  const openInput = () => {
    fileInput.value = "";
    fileInput.click();
  };
  if (!options.managed) doc.getElementById("choose")?.addEventListener("click", () => {
    void pickOrInput(controller, openInput);
  });
  if (!options.managed) doc.getElementById("change")?.addEventListener("click", () => {
    void pickOrInput(controller, openInput);
  });
  if (!options.managed) doc.getElementById("reconnect")?.addEventListener("click", () => {
    void controller.reconnect();
  });
  if (!options.managed) doc.getElementById("reload")?.addEventListener("click", () => {
    void controller.reload();
  });
  if (!options.managed) doc.getElementById("forget")?.addEventListener("click", () => {
    void controller.forget();
  });
  if (!options.managed) fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (file) void controller.chooseFile(file);
  });
  const drop = doc.getElementById("gantt");
  if (!options.managed) drop?.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  if (!options.managed) drop?.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) void controller.chooseFile(file);
  });
  mountGantt(doc, controller);
  void controller.start();
  return controller;
}

async function pickOrInput(controller: ImportController, openInput: () => void): Promise<void> {
  const outcome = await controller.chooseWithPicker();
  if (outcome === "needs-input") openInput();
}

function picker(host: PickerHost): (() => Promise<FileSystemFileHandle[]>) | undefined {
  if (!host.showOpenFilePicker) return undefined;
  const show = host.showOpenFilePicker.bind(host);
  return () =>
    show({
      multiple: false,
      excludeAcceptAllOption: true,
      types: [
        {
          description: "Excel workbook",
          accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
          },
        },
      ],
    });
}

if (typeof document !== "undefined" && document.getElementById("gantt") &&
  document.body?.dataset.sptVariant !== "managed") boot();
