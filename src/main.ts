import { createImportController, type ImportController } from "./data/importController";
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

export function boot(doc: Document = document): void {
  if (!doc.getElementById("gantt")) return;
  const fileInput = doc.getElementById("file");
  if (!(fileInput instanceof HTMLInputElement)) return;
  const paletteStorage = typeof sessionStorage === "undefined" ? null : sessionStorage;
  const controller = createImportController({
    showOpenFilePicker: picker(globalThis as PickerHost),
    paletteStorage,
  });
  const openInput = () => {
    fileInput.value = "";
    fileInput.click();
  };
  doc.getElementById("choose")?.addEventListener("click", () => {
    void pickOrInput(controller, openInput);
  });
  doc.getElementById("change")?.addEventListener("click", () => {
    void pickOrInput(controller, openInput);
  });
  doc.getElementById("reconnect")?.addEventListener("click", () => {
    void controller.reconnect();
  });
  doc.getElementById("reload")?.addEventListener("click", () => {
    void controller.reload();
  });
  doc.getElementById("forget")?.addEventListener("click", () => {
    void controller.forget();
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (file) void controller.chooseFile(file);
  });
  const drop = doc.getElementById("gantt");
  drop?.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  drop?.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) void controller.chooseFile(file);
  });
  mountGantt(doc, controller);
  void controller.start();
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

if (typeof document !== "undefined" && document.getElementById("gantt")) boot();
