import ExcelJS from "exceljs";
import {preflightManagedWorkbook} from "./preflight";
import {inspectProjectData} from "./projectDataInspector";
import {mapB2WbsColumns} from "./b2HeaderMapping";
import {parseCreateManifest,MANIFEST_FIELD} from "./b2ContinuityProof";
import {verifyB2WorkbookReadback} from "./b2WorkbookReadback";
import {prepareCombinedHistoryProof} from "./combinedHistoryProof";
import {importWorkbook} from "../data/normalize";

const AUDIT=["EventID","ChangeSetID","TimestampUTC","EntityType","EntityID","TaskID","Action","Field","OldValue","NewValue","ActorLabel","ActorProvenance","Source","AppVersion"] as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reject=(message:string):never=>{throw Error("b2-standalone:"+message);};
async function open(bytes:Uint8Array){
 const book=new ExcelJS.Workbook();
 await book.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
 return book;
}
/** Synthetic read-only recovery of a *single initial* Task/Create transaction.
 * Reconstructs a hypothetical 0.1.2 predecessor from the candidate itself.
 *
 * This verifies internal audit/row consistency, NOT authenticity of the
 * predecessor or absence of external Excel edits. Subsequent creation batches,
 * later edits and production 0.1.3 reading require their own full contract.
 * No writer, active viewer or Save logic imports this experimental proof. */
export async function inspectStandaloneInitialB2Proof(bytes:Uint8Array){
 const source=bytes.slice();
 await preflightManagedWorkbook(source);
 const book=await open(source),project=inspectProjectData(book);
 if(project.kind!=="unsupported_future"||project.schemaVersion!=="0.1.3")
  return reject("expected-0.1.3-candidate");
 const audit=book.getWorksheet("ProjectAudit"),wbs=book.getWorksheet("ProjectWBS"),
       history=book.getWorksheet("UpdateHistory");
 if(!audit||!wbs||!history)return reject("missing-sheets");
 if(AUDIT.some((f,i)=>audit.getRow(1).getCell(i+1).value!==f)||
   audit.columnCount!==AUDIT.length)return reject("audit-headers");
 const at=(row:ExcelJS.Row,field:typeof AUDIT[number])=>row.getCell(AUDIT.indexOf(field)+1).value;
 let transition=0,transitionChangeSet="",observedCreate=false;
 const ids=new Set<string>(),manifests=new Map<string,number>();
 let priorAuditCount=0,createCount=0;
 for(let i=2;i<=audit.rowCount;i++){
  const row=audit.getRow(i);if(!row.hasValues)continue;
  const version=at(row,"EntityType")==="ProjectMeta"&&at(row,"EntityID")==="ProjectDataSchemaVersion"&&
   at(row,"Action")==="Update"&&at(row,"Field")==="ProjectDataSchemaVersion"&&
   at(row,"OldValue")==="0.1.2"&&at(row,"NewValue")==="0.1.3";
  if(version){
   if(transition||observedCreate)return reject("repeated-or-late-version-change");
   transition=i;
   transitionChangeSet=String(at(row,"ChangeSetID")??"");
   if(!UUID.test(transitionChangeSet))return reject("invalid-create-transaction");
   continue;
  }
  if(!transition){
   if(at(row,"EntityType")==="Task"&&at(row,"Action")==="Create")
    return reject("create-before-version");
   priorAuditCount++;
   continue;
  }
  observedCreate=true;
  if(at(row,"EntityType")!=="Task"||at(row,"Action")!=="Create"||
     at(row,"ChangeSetID")!==transitionChangeSet)return reject("unsupported-follow-on-transaction");
  const task=at(row,"TaskID");
  if(typeof task!=="string"||!UUID.test(task)||at(row,"EntityID")!==task)
   return reject("invalid-created-identity");
  const key=task.toLowerCase();ids.add(key);
  if(at(row,"Field")===MANIFEST_FIELD){
    if(manifests.has(key)||typeof at(row,"NewValue")!=="string")
      return reject("duplicated-manifest");
    const m=parseCreateManifest(String(at(row,"NewValue")));
    if(!m)return reject("invalid-manifest");
    manifests.set(key,m.historyBoundary);
  }
  createCount++;
 }
 if(!transition||!createCount||ids.size!==manifests.size)return reject("incomplete-create-record");
 let physicalHistoryCount=0;
 history.eachRow({includeEmpty:false},(row,i)=>{if(i>1)physicalHistoryCount++;});
 if([...manifests.values()].some(boundary=>boundary!==physicalHistoryCount))
   return reject("unsupported-post-create-edit");
 const predecessor=await open(source);
 const oldAudit=predecessor.getWorksheet("ProjectAudit")!;
 if(oldAudit.rowCount!==audit.rowCount)return reject("readback-shape");
 oldAudit.spliceRows(transition,oldAudit.rowCount-transition+1);
 if(oldAudit.rowCount-1!==priorAuditCount)return reject("audit-prefix-structure");
 const oldWbs=predecessor.getWorksheet("ProjectWBS")!,mapped=mapB2WbsColumns(oldWbs);
 const idColumn=mapped.get("ID");if(!idColumn)return reject("missing-id-column");
 const removed=new Set<string>();
 for(let i=oldWbs.rowCount;i>=2;i--){
  const row=oldWbs.getRow(i);
  if(!row.hasValues)continue;
  const value=row.getCell(idColumn).value;
  if(typeof value==="string"&&ids.has(value.toLowerCase())){
   if(removed.has(value.toLowerCase()))return reject("duplicated-wbs-identity");
   removed.add(value.toLowerCase());
   oldWbs.spliceRows(i,1);
  }
 }
 if(removed.size!==ids.size)return reject("missing-wbs-entity");
 const meta=predecessor.getWorksheet("ProjectMeta");
 if(!meta)return reject("missing-meta");
 let versions=0;
 meta.eachRow({includeEmpty:false},row=>{
   if(row.getCell(1).value==="ProjectDataSchemaVersion"){
     if(row.getCell(2).value!=="0.1.3")reject("unexpected-meta-version");
     row.getCell(2).value="0.1.2";versions++;
   }
 });
 if(versions!==1)return reject("invalid-meta-version");
 const older=inspectProjectData(predecessor);
 if(older.kind!=="valid"||older.schemaVersion!=="0.1.2")
   return reject("invalid-reconstructed-predecessor");
 const checked=verifyB2WorkbookReadback(predecessor,book);
 if(!checked.ok)return reject("readback:"+checked.errors.join(","));
 const normalized=await importWorkbook(source,{paletteStorage:null});
 if(!normalized.ok)return reject("invalid-wbs-domain");
 const predecessorBytes=new Uint8Array(await predecessor.xlsx.writeBuffer());
 const instants=await prepareCombinedHistoryProof(predecessorBytes,source);
 const actualCreations=instants.flatMap(x=>x.entries).filter(x=>x.kind==="create");
 if(actualCreations.length!==ids.size)return reject("missing-history-group");
 return {kind:"verified-synthetic-read" as const,projectName:older.projectName,
  schemaVersion:"0.1.3" as const,taskCount:normalized.tasks.length,createCount:ids.size,
  createAuditRows:createCount,logicalTransactionCount:1,
  history:instants,canWrite:false as const,canActivate:false as const};
}
