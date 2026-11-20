import { prepareNewEntity, type CreationDraft, type NewEntityInput } from "./creationDraft";

type TemplateItem = Pick<NewEntityInput, "title" | "taskType" | "workstream"> & {
  key: string;
  parent?: string;
  after?: readonly string[];
};

const templates = {
  "simple-project": {
    name: "Simple Project",
    items: [
      { key: "delivery", title: "Project delivery", taskType: "Summary", workstream: "Delivery" },
      { key: "plan", title: "Confirm scope", taskType: "Task", workstream: "Delivery", parent: "delivery" },
      { key: "execute", title: "Complete deliverables", taskType: "Task", workstream: "Delivery", parent: "delivery", after: ["plan"] },
    ],
  },
  "cross-functional-program": {
    name: "Cross-functional Program",
    items: [
      { key: "design", title: "Design", taskType: "Summary", workstream: "Design" },
      { key: "requirements", title: "Confirm requirements", taskType: "Task", workstream: "Design", parent: "design" },
      { key: "implementation", title: "Implementation", taskType: "Summary", workstream: "Engineering" },
      { key: "build", title: "Build solution", taskType: "Task", workstream: "Engineering", parent: "implementation", after: ["requirements"] },
      { key: "readiness", title: "Review launch readiness", taskType: "Task", workstream: "Operations", parent: "implementation", after: ["build"] },
    ],
  },
  "milestone-led-delivery": {
    name: "Milestone-led Delivery",
    items: [
      { key: "launch", title: "Launch", taskType: "Summary", workstream: "Launch" },
      { key: "prepare", title: "Prepare launch", taskType: "Task", workstream: "Launch", parent: "launch" },
      { key: "ready", title: "Launch decision", taskType: "Milestone", workstream: "Launch", parent: "launch", after: ["prepare"] },
    ],
  },
} satisfies Record<string, { name: string; items: readonly TemplateItem[] }>;

export type StarterTemplateId = keyof typeof templates;

export const starterTemplateCatalog = (Object.keys(templates) as StarterTemplateId[]).map(id => {
  const items = templates[id].items;
  return {
    id, name: templates[id].name, itemCount: items.length,
    workstreams: [...new Set(items.map(item => item.workstream))],
    requiresMilestoneDate: items.some(item => item.taskType === "Milestone"),
  };
});

/** Prepare reviewable drafts through the Stage C creator in dependency order. */
export function prepareStarterTemplate(
  templateId: StarterTemplateId,
  milestoneDate?: string,
  generateId: () => string = () => crypto.randomUUID(),
) {
  const items: readonly TemplateItem[] = templates[templateId].items;
  const drafts: CreationDraft[] = [];
  const byKey = new Map<string, string>();

  for (const item of items) {
    const parentId = item.parent ? byKey.get(item.parent) : null;
    const predecessorIds = (item.after ?? []).map(key => byKey.get(key) ?? "");
    if (byKey.has(item.key) || (item.parent && !parentId) || predecessorIds.includes("")) {
      return { ok: false as const, item: item.key, errors: ["Invalid template relationship."] };
    }

    const result = prepareNewEntity({
      title: item.title, taskType: item.taskType, workstream: item.workstream, parentId,
      predecessorIds, plannedStart: item.taskType === "Milestone" ? milestoneDate : undefined,
    }, drafts, generateId().trim().toLowerCase());
    if (!result.ok) return { ok: false as const, item: item.key, errors: result.errors };

    byKey.set(item.key, result.draft.id);
    drafts.push(result.draft);
  }
  return { ok: true as const, drafts };
}
