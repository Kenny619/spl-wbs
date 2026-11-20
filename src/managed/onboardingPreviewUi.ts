import {prepareProjectOnboarding} from "./projectOnboarding";
import {readGuidedSource,prepareGuidedPreview} from "./guidedImportReader";
import {IMPORT_FIELDS,planImportHeaders,type HeaderOverride,type ImportField} from "./guidedImportMapping";
import {starterTemplateCatalog,type StarterTemplateId} from "./starterProjectTemplates";
import {prepareBoundedGuidedArchive} from "./guidedArchiveSafety";
import {MANAGED_APP_VERSION} from "./version";
import {preparePopulatedProjectProof} from "./populatedProjectProof";
import type {BlankProjectInput} from "./blankProjectCandidate";

type Grid=Extract<Awaited<ReturnType<typeof readGuidedSource>>,{kind:"grid"}>;
type Route="scratch"|"import"|"template";
type Review={wbsCode:string;title:string;taskType:string;parentId:string|null;predecessorIds:readonly string[];plannedStart:string|null;plannedEnd:string|null;id:string};
const LIMIT=25*1024*1024;
const PAGE=50;
const makeId=()=>crypto.randomUUID();

export function mountOnboardingPreview(root:HTMLElement){
 const doc=root.ownerDocument;
 let generation=0,route:Route="scratch",grid:Grid|null=null,source:Uint8Array|null=null;
 let allocated:Record<number,string>={},overrides:HeaderOverride[]=[],page=0;
 let scale:"percent-points"|"fraction"|undefined;
 let reviewed=false,labelSequence=0;
 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{
   const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;
 };
 function labeled(label:string,control:HTMLElement){
   const l=el("label"),caption=el("span",label);
   // Reference only the label text, never the nested select options. Native
   // label association is retained for pointer and keyboard accessibility.
   caption.id="onboarding-label-"+(++labelSequence);
   control.setAttribute("aria-labelledby",caption.id);
   l.append(caption,doc.createTextNode(" "),control);return l;
 }
 function button(text:string,run:()=>void){const b=el("button",text);b.type="button";b.addEventListener("click",run);return b;}
 function option(value:string,label:string){const o=el("option",label);o.value=value;return o;}
 const routes=el("nav"),body=el("section"),result=el("section"),message=el("p"),heading=el("h1","New project — review preview");
 message.setAttribute("role","status");message.setAttribute("aria-live","polite");
 result.setAttribute("aria-label","Review results");body.setAttribute("aria-label","Project preparation");
 const reset=()=>{generation++;source=null;grid=null;allocated={};overrides=[];scale=undefined;reviewed=false;page=0;message.textContent="";result.replaceChildren();};
 const routeButtons:HTMLButtonElement[]=[];
 for(const [value,label] of [["scratch","Start from scratch"],["import","Import Excel"],["template","Use a starter template"]] as const){
   const b=button(label,()=>select(value));routeButtons.push(b);routes.append(b);
 }
 root.replaceChildren(heading,el("p","Development preview. Use fictional workbooks only. No file can be saved, downloaded, overwritten, or opened as the active project."),routes,body,message,result);
 function current(token:number){return token===generation;}
 function invalidate(){generation++;reviewed=false;page=0;message.textContent="";result.replaceChildren();}
 function select(next:Route){
   reset();route=next;body.replaceChildren();
   routeButtons.forEach((b,i)=>b.setAttribute("aria-pressed",String(["scratch","import","template"][i]===route)));
   if(route==="scratch")scratch();
   if(route==="import")importForm();
   if(route==="template")template();
 }
 function showRows(drafts:readonly Review[]){
   const title=el("h3","Tasks and relationships ("+drafts.length+")");
   const table=el("table"),head=el("thead"),tr=el("tr");
   for(const h of ["WBS","Task","Type","Parent","Predecessors","Start","Finish"])tr.append(el("th",h));
   head.append(tr);table.append(head);
   const tbody=el("tbody"),byId=new Map(drafts.map(d=>[d.id,d.wbsCode]));
   for(const item of drafts.slice(page*PAGE,(page+1)*PAGE)){
     const row=el("tr");
     for(const v of [item.wbsCode,item.title,item.taskType,item.parentId?(byId.get(item.parentId)??"Unresolved"):"—",
       item.predecessorIds.map(id=>byId.get(id)??"Unresolved").join(", ")||"—",item.plannedStart??"—",item.plannedEnd??"—"])row.append(el("td",v));
     tbody.append(row);
   }
   table.append(tbody);
   const wrap=el("div");wrap.className="review-table";wrap.append(table);
   const controls=el("p"),count=el("span"," Rows "+(drafts.length?page*PAGE+1:0)+"–"+Math.min((page+1)*PAGE,drafts.length)+" of "+drafts.length+" ");
   const prev=button("Previous",()=>{page--;render();});prev.disabled=page===0;
   const next=button("Next",()=>{page++;render();});next.disabled=(page+1)*PAGE>=drafts.length;
   const container=el("section");
   function render(){const old=container.parentNode;if(old){const focus=doc.activeElement===prev?"prev":"next";const nextNode=showRows(drafts);old.replaceChild(nextNode,container);const buttons=nextNode.querySelectorAll("button");(focus==="prev"?buttons[0]:buttons[1])?.focus();}}
   controls.append(prev,count,next);container.append(title,wrap,controls);return container;
 }
 function confirmation(valid:boolean,verify?:(project:BlankProjectInput,changeSetId:string)=>ReturnType<typeof preparePopulatedProjectProof>){
   const holder=el("div"),check=el("input");check.type="checkbox";check.disabled=!valid;
   check.checked=reviewed;const status=el("p",reviewed?"Review acknowledged. Saving remains disabled.":"Review not acknowledged.");
   const name=el("input"),actor=el("input"),proof=el("p");
   name.maxLength=160;actor.maxLength=160;
   proof.setAttribute("role","status");
   let revision=0;
   const verifyButton=button("Verify disposable populated workbook",()=>{
     if(!verify||!reviewed||!name.value.trim()||!actor.value.trim())return;
     const token=generation,ticket=++revision;
     verifyButton.disabled=true;
     proof.textContent="Constructing and reopening a disposable candidate…";
     const project:BlankProjectInput={projectId:makeId(),projectName:name.value.trim(),actorLabel:actor.value.trim(),
       changeSetId:makeId(),timestampUTC:new Date().toISOString(),appVersion:MANAGED_APP_VERSION};
     void verify(project,makeId()).then(candidate=>{
       if(!current(token)||ticket!==revision||!reviewed)return;
       proof.textContent="Disposable workbook verified: "+candidate.taskCount+" tasks, "+candidate.auditRows+" task audit rows. No file saved.";
       verifyButton.disabled=false;
     }).catch(error=>{
       if(!current(token)||ticket!==revision||!reviewed)return;
       proof.textContent="Candidate refused: "+(error instanceof Error?error.message:"Unexpected verification failure");
       verifyButton.disabled=false;
     });
   });
   function syncProof(){
     revision++;proof.textContent="";
     verifyButton.disabled=!valid||!reviewed||!name.value.trim()||!actor.value.trim();
     name.disabled=!valid||!reviewed;actor.disabled=!valid||!reviewed;
   }
   check.addEventListener("change",()=>{
     reviewed=check.checked;
     status.textContent=reviewed?"Review acknowledged. Saving remains disabled.":"Review not acknowledged.";
     syncProof();
   });
   holder.append(labeled("I have reviewed the proposed project and its diagnostics.",check),status);
   if(verify){
     name.addEventListener("input",syncProof);actor.addEventListener("input",syncProof);
     holder.append(labeled("Candidate project name",name),labeled("Candidate local actor (unverified)",actor),verifyButton,proof);
     syncProof();
   }
   return holder;
 }
 function diagnostics(title:string,items:readonly unknown[]){
   const section=el("details");section.open=items.length>0;
   section.append(el("summary",title+" ("+items.length+")"));
   const list=el("ul");
   for(const item of items.slice(0,200))list.append(el("li",typeof item==="string"?item:JSON.stringify(item)));
   if(items.length>200)list.append(el("li","Further "+(items.length-200)+" entries are omitted from this prototype display. Resolve issues or narrow the source before proceeding."));
   section.append(list);return section;
 }
 function scratch(){
   const name=el("input"),actor=el("input");name.required=true;actor.required=true;name.maxLength=160;actor.maxLength=160;
   name.addEventListener("input",invalidate);actor.addEventListener("input",invalidate);
   const prepare=button("Prepare empty project",()=>{
     invalidate();const token=generation;
     if(!name.value.trim()||!actor.value.trim()){message.textContent="Project name and local actor label are required.";return;}
     message.textContent="Preparing and reopening a disposable workbook…";
     void prepareProjectOnboarding({route:"scratch",project:{projectId:makeId(),projectName:name.value.trim(),
       actorLabel:actor.value.trim(),changeSetId:makeId(),timestampUTC:new Date().toISOString(),appVersion:MANAGED_APP_VERSION}})
       .then(r=>{if(!current(token)||r.route!=="scratch")return;
         message.textContent="Empty candidate verified in memory.";
         result.append(el("h2",name.value.trim()),el("p","Schema "+r.candidate.schemaVersion+" · 0 tasks · no file written"),confirmation(true));
       }).catch(e=>{if(current(token))message.textContent=e instanceof Error?e.message:"Preparation failed";});
   });
   body.append(labeled("Project name",name),labeled("Local actor label (unverified)",actor),prepare);
 }
 function template(){
   const choice=el("select"),date=el("input");date.type="date";
   for(const item of starterTemplateCatalog)choice.append(option(item.id,item.name+" ("+item.itemCount+" items)"));
   const dateField=labeled("Milestone date",date);
   function sync(){invalidate();dateField.hidden=!starterTemplateCatalog.find(x=>x.id===choice.value)?.requiresMilestoneDate;}
   choice.addEventListener("change",sync);date.addEventListener("change",invalidate);
   body.append(labeled("Template",choice),dateField,button("Preview template",()=>{
     invalidate();const token=generation;
     void prepareProjectOnboarding({route:"template",templateId:choice.value as StarterTemplateId,milestoneDate:date.value||undefined})
       .then(r=>{if(!current(token)||r.route!=="template")return;
         if(!r.preview.ok){message.textContent="Template needs correction.";result.append(diagnostics("Issues",r.preview.errors));return;}
         message.textContent="Template reviewed in memory; populated saving is not enabled.";
         const drafts=r.preview.drafts,templateId=r.templateId,milestoneDate=date.value||undefined;
         result.append(showRows(drafts),confirmation(true,(project,createChangeSetId)=>{
           let index=0;
           return preparePopulatedProjectProof({route:"template",project,createChangeSetId,templateId,milestoneDate,
             generateTaskId:()=>drafts[index++]?.id??""});
         }));
       }).catch(e=>{if(current(token))message.textContent=e instanceof Error?e.message:"Template failed";});
   }));sync();
 }
 function importForm(){
   const input=el("input");input.type="file";input.accept=".xlsx";
   input.addEventListener("change",()=>{
     reset();const token=generation,file=input.files?.[0];
     sheetControls.replaceChildren();
     if(!file)return;
     if(!/\.xlsx$/i.test(file.name)||file.size===0||file.size>LIMIT){message.textContent="Select an XLSX no larger than 25 MiB.";return;}
     message.textContent="Checking the archive…";
     void file.arrayBuffer().then(bytes=>prepareBoundedGuidedArchive(new Uint8Array(bytes))).then(bytes=>{
       if(!current(token))return;
       source=bytes;void readSheet(undefined);
     }).catch(e=>{if(current(token))message.textContent="Archive refused: "+(e instanceof Error?e.message:"invalid archive");});
   });
   const sheetControls=el("div");
   body.append(labeled("Synthetic XLSX",input),sheetControls);
   async function readSheet(selected:string|undefined){
     invalidate();const token=generation;
     grid=null;allocated={};overrides=[];scale=undefined;sheetControls.replaceChildren();
     if(!source)return;
     message.textContent="Reading worksheet…";
     try{
       const r=await readGuidedSource(source,selected);
       if(!current(token))return;
       if(r.kind==="native-workbook"){message.textContent="Managed workbook detected. Use the existing native Open workflow; guided conversion refused.";return;}
       if(r.kind==="rejected"){message.textContent="Import refused.";result.append(diagnostics("Reader issues",r.issues));return;}
       if(r.kind==="choose-sheet"){
         const choice=el("select");for(const name of r.names)choice.append(option(name,name));
         sheetControls.append(labeled("Worksheet",choice),button("Review worksheet",()=>{void readSheet(choice.value);}));
         message.textContent="Select one source worksheet.";return;
       }
       grid=r;for(const row of r.records)allocated[row.excelRow]=makeId();
       if(r.otherSheets.length){
         const choice=el("select");for(const name of [r.sheetName,...r.otherSheets])choice.append(option(name,name));
         sheetControls.append(labeled("Worksheet",choice),button("Change worksheet",()=>{void readSheet(choice.value);}));
       }
       showMapping();reviewImport();
     }catch(e){if(current(token))message.textContent=e instanceof Error?e.message:"Read failed";}
   }
   function showMapping(){
     if(!grid)return;
     const controls=el("section");controls.className="mapping";
     const plan=planImportHeaders(grid.headers);
     controls.append(el("h2","Column mapping"),el("p","Unmapped populated columns block review. Choose Exclude explicitly to omit a column."));
     grid.headers.forEach((header,i)=>{
       const choice=el("select");
       const inferred=IMPORT_FIELDS.find(f=>plan.columns[f]===i);
       choice.append(option("auto","Automatic"+(inferred?": "+inferred:"")),option("exclude","Exclude column"));
       for(const field of IMPORT_FIELDS)choice.append(option(field,field));
       choice.addEventListener("change",()=>{
         overrides=overrides.filter(item=>item.column!==i);
         if(choice.value!=="auto")overrides.push({column:i,field:choice.value==="exclude"?null:choice.value as ImportField});
         reviewImport();
       });
       controls.append(labeled("Column "+(i+1)+": "+(header||"(blank header)"),choice));
     });
     const progress=el("select");
     progress.append(option("","Not specified"),option("percent-points","0–100 percentage points"),option("fraction","0–1 fraction"));
     progress.addEventListener("change",()=>{scale=progress.value==="fraction"||progress.value==="percent-points"?progress.value:undefined;reviewImport();});
     controls.append(labeled("Unformatted numeric progress",progress));sheetControls.append(controls);
   }
   function reviewImport(){
     if(!grid)return;
     invalidate();
     const p=prepareGuidedPreview(grid,allocated,overrides,scale),valid=p.corePreviewValid&&p.targetIdentity?.ok===true;
     message.textContent=valid?"Review ready; saving remains disabled.":"Resolve import diagnostics before acknowledging review.";
     result.append(el("h2","Source review — "+p.sourceSheet),el("p",p.sourceItemCount+" source items · "+p.mapping.skippedBlankRows.length+" blank rows · "+p.mapping.excludedCells.length+" explicitly excluded cells"),
       diagnostics("Unselected worksheets",p.otherSheets),diagnostics("Reader issues",p.readerIssues),diagnostics("Mapping issues",p.mapping.issues),
       diagnostics("Normalization issues",p.normalized.issues),diagnostics("Generated / defaulted / inferred values",p.normalized.review),
       diagnostics("Explicit exclusions",p.mapping.excludedCells),diagnostics("Identity issues",p.targetIdentity&&!p.targetIdentity.ok?p.targetIdentity.issues:[]));
     if(p.normalized.drafts.length)result.append(showRows(p.normalized.drafts));
     result.append(confirmation(valid&&p.mapping.excludedCells.length<=200&&p.normalized.review.length<=200&&p.otherSheets.length<=200,
       (project,createChangeSetId)=>preparePopulatedProjectProof({route:"import",project,createChangeSetId,preview:p})));
   }
 }
 select("scratch");
 return {dispose(){reset();root.replaceChildren();}};
}
