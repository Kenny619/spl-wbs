import ExcelJS from "exceljs";
import { buildProjectDataCandidate, type ProjectCandidateInput } from "./projectDataCandidate";
import { HISTORY_COLUMNS } from "./workbookCandidate";
import { inspectProjectData } from "./projectDataInspector";
import { readManagedHistoryWithPresence } from "./history";
import { importWorkbook } from "../data/normalize";
import { ManagedWorkbookError } from "./preflight";

export const STARTER_WBS_HEADERS = [
  "ID","Title","WBSCode","TaskType","ParentTaskID","PlannedStart","PlannedEnd",
  "Progress","TaskStatus","AssignedTo","Workstream","PredecessorIDs","Priority",
  "Description","Updates","SortOrder","Modified","ItemURL",
] as const;
export type BlankProjectInput = Omit<ProjectCandidateInput,"source"|"edit"> & {
  projectId:string; projectName:string;
};
/** Uses the accepted 0.1.2 initialization contract. Returns disposable
 * bytes only; no filesystem, download, Save or active-session changes.
 * Populated projects need the separately gated B2 Task/Create contract. */
export async function prepareBlankProject(input:BlankProjectInput){
  const book=new ExcelJS.Workbook();
  book.addWorksheet("ProjectWBS").addRow([...STARTER_WBS_HEADERS]);
  book.addWorksheet("UpdateHistory").addRow([...HISTORY_COLUMNS]);
  const source=new Uint8Array(await book.xlsx.writeBuffer());
  const result=await buildProjectDataCandidate({
    source,edit:{kind:"initialize",projectId:input.projectId,projectName:input.projectName},
    actorLabel:input.actorLabel,appVersion:input.appVersion,changeSetId:input.changeSetId,
    timestampUTC:input.timestampUTC,
  });
  if(result.kind!=="candidate")throw new ManagedWorkbookError("BLANK_PROJECT_FAILED","Project initialization returned no candidate.");
  const read=await importWorkbook(result.bytes,{paletteStorage:null});
  const history=await readManagedHistoryWithPresence(result.bytes);
  const reopened=new ExcelJS.Workbook();
  await reopened.xlsx.load(result.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  const inspection=inspectProjectData(reopened);
  const wbs=reopened.getWorksheet("ProjectWBS"), audit=reopened.getWorksheet("ProjectAudit");
  if(!read.ok || read.tasks.length!==0 || !history.present || history.events.length!==0 ||
      inspection.kind!=="valid" || inspection.projectName!==input.projectName ||
      !wbs || wbs.rowCount!==1 || !audit || audit.rowCount!==4 ||
      ["ProjectCalendar","WatchReasons","ProjectCommitments"].some(name=>reopened.getWorksheet(name)?.rowCount!==1)){
    throw new ManagedWorkbookError("BLANK_PROJECT_READBACK","Empty project failed canonical readback.");
  }
  for(let row=2;row<=audit.rowCount;row++){
    if(audit.getRow(row).getCell(4).value!=="ProjectMeta" || audit.getRow(row).getCell(6).value!==null){
      throw new ManagedWorkbookError("BLANK_PROJECT_READBACK","Unexpected task audit in blank project.");
    }
  }
  return {kind:"blank-candidate" as const,bytes:result.bytes,schemaVersion:"0.1.2" as const,taskCount:0};
}
