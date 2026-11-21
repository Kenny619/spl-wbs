import ExcelJS from "exceljs";
import { describe,it,expect } from "vitest";
import { prepareBlankProject,STARTER_WBS_HEADERS } from "../../src/managed/blankProjectCandidate";
const input={projectId:"11111111-1111-4111-8111-111111111111",projectName:"Fictional Project",
 changeSetId:"22222222-2222-4222-8222-222222222222",timestampUTC:"2026-11-19T00:00:00.000Z",
 actorLabel:"Fictional PM",appVersion:"test"};
describe("blank project in-memory candidate",()=>{
 it("generates valid empty managed workbook with no fabricated tasks or history",async()=>{
  const result=await prepareBlankProject(input);
  expect(result.taskCount).toBe(0);
  expect(result.schemaVersion).toBe("0.1.2");
  const book=new ExcelJS.Workbook();
  await book.xlsx.load(result.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(book.worksheets.map(s=>s.name).sort()).toEqual(["ProjectWBS","UpdateHistory","ProjectMeta","ProjectCalendar","WatchReasons","ProjectCommitments","ProjectAudit"].sort());
  expect(book.getWorksheet("ProjectWBS")!.getRow(1).values).toEqual([, ...STARTER_WBS_HEADERS]);
  expect(book.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
  expect(book.getWorksheet("ProjectAudit")!.rowCount).toBe(4);
 });
 it("rejects invalid project names and transaction identities",async()=>{
  await expect(prepareBlankProject({...input,projectName:"=bad"})).rejects.toThrow();
  await expect(prepareBlankProject({...input,changeSetId:"bad"})).rejects.toThrow();
 });
});
