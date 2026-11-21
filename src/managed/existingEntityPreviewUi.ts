import ExcelJS from "exceljs";
import {importWorkbook} from "../data/normalize";
import {TASK_TYPES,type Task,type TaskType} from "../data/types";
import {inspectProjectData} from "./projectDataInspector";
import {preflightManagedWorkbook} from "./preflight";
import {prepareNewEntity,suggestWbsCode,type NewEntityInput} from "./creationDraft";
import {prepareExistingEntityProof} from "./existingEntityProof";
import {MANAGED_APP_VERSION} from "./version";
import {prepareCombinedHistoryProof} from "./combinedHistoryProof";
import {renderCandidateHistoryReview} from "./candidateHistoryReviewUi";

/** Explicit opt-in, in-memory Stage C authoring review. No Save, download,
 * session replacement or source workbook mutation is accessible from here. */
export function mountExistingEntityPreview(root:HTMLElement,loadedSource:Uint8Array,timeZone="Asia/Tokyo"){
 const doc=root.ownerDocument,source=loadedSource.slice();
 let alive=true,revision=0,busy=false,taskId:string=crypto.randomUUID(),tasks:Task[]=[];
 const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{
  const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;
 };
 let idSequence=0;
 function label(name:string,control:HTMLElement){
  const holder=make("label"),caption=make("span",name);
  caption.id="create-preview-label-"+(++idSequence);
  control.setAttribute("aria-labelledby",caption.id);
  holder.append(caption,doc.createTextNode(" "),control);return holder;
 }
 const option=(value:string,text:string)=>{
  const e=make("option",text);e.value=value;return e;
 };
 const section=make("section"),status=make("p","Validating existing workbook…"),validation=make("ul");
 const result=make("p"),historyReview=make("section"),review=make("input"),button=make("button","Verify disposable entity candidate");
 historyReview.setAttribute("aria-label","Candidate creation history");
 const title=make("input"),type=make("select"),parent=make("select"),wbs=make("input"),
       start=make("input"),finish=make("input"),owner=make("input"),workstream=make("input"),
       predecessors=make("select"),actor=make("input"),suggestion=make("p");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 result.setAttribute("aria-live","polite");
 title.maxLength=160;owner.maxLength=160;workstream.maxLength=160;actor.maxLength=160;
 wbs.maxLength=80;start.type="date";finish.type="date";
 review.type="checkbox";predecessors.multiple=true;predecessors.size=4;
 button.type="button";button.disabled=true;
 for(const item of TASK_TYPES)type.append(option(item,item));
 type.value="Task"; // Safe first-entry default; Summary and Milestone remain selectable.
 parent.append(option("","No parent (root)"));
 section.append(
  label("Task title",title),label("Task type",type),label("Parent Summary",parent),
  label("WBS code (optional override)",wbs),suggestion,
  label("Planned start",start),label("Planned finish",finish),
  label("Predecessors (optional, multiple)",predecessors),
  label("Owner (optional)",owner),label("Workstream (optional)",workstream),
  label("Local actor (unverified)",actor),
  label("I have reviewed the proposed entity and validation findings.",review),
  button,
 );
 root.replaceChildren(make("h2","Add entity — development preview"),
  make("p","In-memory verification of a new task against the loaded workbook. No file will be saved, downloaded or activated."),
  status,section,validation,result,historyReview);
 section.hidden=true;
 const controls=[title,type,parent,wbs,start,finish,owner,workstream,predecessors,actor];
 function input():NewEntityInput{
  return {title:title.value,taskType:type.value as TaskType,parentId:parent.value||null,
   wbsCode:wbs.value||null,plannedStart:start.value||null,plannedEnd:finish.value||null,
   predecessorIds:Array.from(predecessors.selectedOptions,x=>x.value),
   owner:owner.value,workstream:workstream.value};
 }
 function renderValidation(){
  revision++;busy=false;result.textContent="";historyReview.replaceChildren();review.checked=false;validation.replaceChildren();
  if(!tasks.length){button.disabled=true;return;}
  const selected=tasks.find(t=>t.id===parent.value);
  suggestion.textContent="Suggested code: "+suggestWbsCode(tasks,selected?.wbsCode??null);
  const check=prepareNewEntity(input(),tasks,taskId);
  if(!check.ok){
   for(const error of check.errors)validation.append(make("li",error));
   status.textContent="Resolve the issues before confirming the creation draft.";
  }else{
   status.textContent="Valid draft: "+check.draft.taskType+" · "+check.draft.wbsCode+" · new immutable ID "+check.draft.id;
  }
  button.disabled=true;
 }
 function canVerify(){
  if(!alive||busy||!review.checked||!actor.value.trim()||!tasks.length)return false;
  return prepareNewEntity(input(),tasks,taskId).ok;
 }
 for(const control of controls)control.addEventListener(control.tagName==="SELECT"?"change":"input",()=>{
  if(control===parent)wbs.value="";
  renderValidation();
 });
 review.addEventListener("change",()=>{revision++;busy=false;result.textContent="";historyReview.replaceChildren();button.disabled=!canVerify();});
 button.addEventListener("click",()=>{
  if(!canVerify())return;
  busy=true;const token=++revision;button.disabled=true;
  const draft=input();
  const actorLabel=actor.value.trim();
  result.textContent="Checking a disposable candidate and complete B2 creation audit…";
  void prepareExistingEntityProof({source:source.slice(),draft,taskId,
   changeSetId:crypto.randomUUID(),timestampUTC:new Date().toISOString(),
   actorLabel,appVersion:MANAGED_APP_VERSION}).then(async candidate=>{
    // Closing the dialog or changing a field invalidates this attempt before
    // starting the second, potentially expensive workbook readback.
    if(!alive||revision!==token)return;
    const instants=await prepareCombinedHistoryProof(source,candidate.bytes);
    if(!alive||revision!==token)return;
    renderCandidateHistoryReview(historyReview,instants,timeZone);
    busy=false;
    result.textContent="Verified in memory: "+candidate.taskCount+
     " tasks (one newly created), "+candidate.taskAuditRows+" creation audit rows. No file saved.";
    button.disabled=!canVerify();
  }).catch(error=>{
    if(!alive||revision!==token)return;
    busy=false;
    historyReview.replaceChildren();
    result.textContent="Candidate rejected: "+(error instanceof Error?error.message:"Unverified candidate");
    button.disabled=!canVerify();
  });
 });
 void (async()=>{
  try{
   await preflightManagedWorkbook(source);
   const book=new ExcelJS.Workbook();
   await book.xlsx.load(source as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
   if(inspectProjectData(book).kind!=="valid")throw Error("A supported 0.1.2 ProjectData workbook is required.");
   const imported=await importWorkbook(source,{paletteStorage:null});
   if(!imported.ok||!imported.tasks.length)throw Error("Existing workbook WBS validation failed.");
   if(!alive)return;
   tasks=imported.tasks;
   for(const task of tasks){
    if(task.taskType==="Summary")parent.append(option(task.id,task.wbsCode+" · "+task.taskName));
    predecessors.append(option(task.id,task.wbsCode+" · "+task.taskName));
   }
   section.hidden=false;renderValidation();
  }catch(error){
   if(alive){status.textContent="Creation review unavailable: "+(error instanceof Error?error.message:"Invalid workbook");section.hidden=true;}
  }
 })();
 return {dispose(){alive=false;revision++;taskId="";source.fill(0);historyReview.replaceChildren();root.replaceChildren();}};
}
