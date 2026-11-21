import { prepareBlankProject, type BlankProjectInput } from "./blankProjectCandidate";
import { readGuidedSource, prepareGuidedPreview } from "./guidedImportReader";
import type { HeaderOverride } from "./guidedImportMapping";
import { prepareStarterTemplate, type StarterTemplateId } from "./starterProjectTemplates";

type ScratchRoute = { route: "scratch"; project: BlankProjectInput };
type ImportRoute = {
  route: "import";
  source: Uint8Array;
  sheet?: string;
  generatedIds: Readonly<Record<number, string>>;
  overrides?: readonly HeaderOverride[];
  progressScale?: "percent-points" | "fraction";
};
type TemplateRoute = {
  route: "template";
  templateId: StarterTemplateId;
  milestoneDate?: string;
  generateId?: () => string;
};

/** Prepare the three onboarding routes without selecting or changing an active workbook.
 * Populated routes stop at review data until the versioned writer is approved.
 */
export async function prepareProjectOnboarding(request: ScratchRoute | ImportRoute | TemplateRoute) {
  switch (request.route) {
    case "scratch":
      return { route: request.route, candidate: await prepareBlankProject(request.project) };
    case "import": {
      const result = await readGuidedSource(request.source, request.sheet);
      if (result.kind !== "grid") return { route: request.route, result };
      return {
        route: request.route,
        result: { kind: "preview" as const, ...prepareGuidedPreview(
          result, request.generatedIds, request.overrides, request.progressScale,
        ) },
      };
    }
    case "template":
      return {
        route: request.route, templateId: request.templateId, persistenceReady: false as const,
        preview: prepareStarterTemplate(request.templateId, request.milestoneDate, request.generateId),
      };
  }
}
