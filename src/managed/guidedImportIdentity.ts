type SourceIdentity = {
  sourceRow: number;
  id: string;
  parentId: string | null;
  predecessorIds: readonly string[];
  original: { ID?: unknown };
};

type IdentityIssue = {
  row: number;
  code: "duplicate-source-id" | "invalid-target-id" | "duplicate-target-id" | "unresolved-reference";
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key = (id: string) => uuid.test(id) ? id.toLowerCase() : id;

/** Build a separate B2 identity projection for external workbooks.
 * The caller retains one UUID allocation per source row throughout review.
 */
export function prepareGuidedTargetIdentity(
  drafts: readonly SourceIdentity[],
  allocatedIds: Readonly<Record<number, string>>,
) {
  const issues: IdentityIssue[] = [];
  const bySource = new Map<string, string>();
  const seenTargets = new Set<string>();

  for (const draft of drafts) {
    const sourceKey = key(draft.id);
    const allocation = uuid.test(draft.id) ? draft.id : allocatedIds[draft.sourceRow];
    if (bySource.has(sourceKey)) {
      issues.push({ row: draft.sourceRow, code: "duplicate-source-id" });
      continue;
    }
    if (!allocation || !uuid.test(allocation)) {
      issues.push({ row: draft.sourceRow, code: "invalid-target-id" });
      continue;
    }
    const target = allocation.toLowerCase();
    bySource.set(sourceKey, target);
    if (seenTargets.has(target)) issues.push({ row: draft.sourceRow, code: "duplicate-target-id" });
    seenTargets.add(target);
  }
  if (issues.length) return { ok: false as const, issues };

  const identities = drafts.map(draft => {
    const remap = (source: string) => {
      const target = bySource.get(key(source));
      if (!target) issues.push({ row: draft.sourceRow, code: "unresolved-reference" });
      return target ?? "";
    };
    return {
      sourceRow: draft.sourceRow,
      sourceId: draft.original.ID ?? null,
      id: remap(draft.id),
      parentId: draft.parentId === null ? null : remap(draft.parentId),
      predecessorIds: draft.predecessorIds.map(remap),
    };
  });
  return issues.length ? { ok: false as const, issues } : { ok: true as const, identities };
}
