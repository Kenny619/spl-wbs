import { describe, expect, it } from "vitest";
import { normalizeGuidedRows } from "../../src/managed/guidedImportNormalize";
const opts = {date1904:false,progressScale:"percent-points" as const,generatedIds:{
  2:"11111111-1111-4111-8111-111111111111",3:"22222222-2222-4222-8222-222222222222"}};
describe("guided import core normalization (non-writing)",()=>{
  it("generates stable caller-supplied IDs and root codes for Title-only rows",()=>{
    const input=[{excelRow:2,values:{Title:"A"}},{excelRow:3,values:{Title:"B"}}];
    const r=normalizeGuidedRows(input,opts);
    expect(r.coreValid).toBe(true);
    expect(r.drafts.map(d=>[d.id,d.wbsCode,d.status])).toEqual([[opts.generatedIds[2],"1","Not Started"],[opts.generatedIds[3],"2","Not Started"]]);
    expect(input[0].values).toEqual({Title:"A"});
  });
  it("preserves existing IDs and resolves explicit hierarchy and dependencies",()=>{
    const r=normalizeGuidedRows([
      {excelRow:2,values:{Title:"Parent",ID:"p",WBSCode:"1"}},
      {excelRow:3,values:{Title:"A",ID:"a",WBSCode:"1.1",ParentTaskID:"p",Progress:0}},
      {excelRow:4,values:{Title:"B",ID:"b",WBSCode:"1.2",PredecessorWBS:"1.1"}},
    ],opts);
    expect(r.coreValid).toBe(true);
    expect(r.drafts[0].taskType).toBe("Summary");
    expect(r.drafts[1].parentId).toBe("p");
    expect(r.drafts[1].progress).toBe(0);
    expect(r.drafts[2].predecessorIds).toEqual(["a"]);
  });
  it("rejects duplicate identity, missing hierarchy and unresolved dependency",()=>{
    const r=normalizeGuidedRows([
      {excelRow:2,values:{Title:"A",ID:"a",WBSCode:"1"}},
      {excelRow:3,values:{Title:"B",ID:"a",WBSCode:"2.1",PredecessorIDs:"nope"}},
    ],opts);
    expect(r.issues.map(i=>i.code)).toEqual(expect.arrayContaining(["duplicate-id","missing-parent-prefix","invalid-dependency"]));
  });
  it("detects dependency cycles",()=>{
    const r=normalizeGuidedRows([
      {excelRow:2,values:{Title:"A",ID:"a",PredecessorIDs:"b"}},
      {excelRow:3,values:{Title:"B",ID:"b",PredecessorIDs:"a"}},
    ],opts);
    expect(r.coreValid).toBe(false);
    expect(r.issues.some(i=>i.code==="cycle-or-dependent-on-cycle")).toBe(true);
  });
  it("requires an explicit numeric progress convention and preserves formatted percentage",()=>{
    const noScale={...opts,progressScale:undefined};
    const r=normalizeGuidedRows([{excelRow:2,values:{Title:"A",Progress:0.5}}],noScale);
    expect(r.coreValid).toBe(false);
    const p=normalizeGuidedRows([{excelRow:2,values:{Title:"A",Progress:{kind:"number",value:0.5,format:"0%"}}}],noScale);
    expect(p.coreValid).toBe(true);
    expect(p.drafts[0].progress).toBe(50);
  });
  it("rejects ambiguous dates, unknown status and unsupported cells without dropping rows",()=>{
    const r=normalizeGuidedRows([{excelRow:2,values:{Title:"A",PlannedStart:"11/12/26",TaskStatus:"Maybe",Description:{kind:"error"}}}],opts);
    expect(r.drafts).toHaveLength(1);
    expect(r.issues.map(i=>i.code)).toEqual(expect.arrayContaining(["invalid-date","unknown-status","unsupported-cell"]));
  });
  it("normalizes one valid milestone date and refuses incomplete task dates",()=>{
    const r=normalizeGuidedRows([{excelRow:2,values:{Title:"M",TaskType:"Milestone",PlannedEnd:"2026-11-30"}}],opts);
    expect(r.coreValid).toBe(true);
    expect(r.drafts[0].plannedStart).toBe("2026-11-30");
    expect(normalizeGuidedRows([{excelRow:2,values:{Title:"T",PlannedEnd:"2026-11-30"}}],opts).coreValid).toBe(false);
  });
  it("rejects missing mixed WBS codes and preserves source optional values for later review",()=>{
    const r=normalizeGuidedRows([{excelRow:2,values:{Title:"A",WBSCode:"1",Updates:"prior note"}},{excelRow:3,values:{Title:"B"}}],opts);
    expect(r.coreValid).toBe(false);
    expect(r.drafts[0].original.Updates).toBe("prior note");
  });
});
