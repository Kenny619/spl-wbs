import {todayInTimeZone} from "../calendar/dateOnly";
import {historyDisplayTime} from "./history";
import {buildCombinedHistoryReport,type HistoryInstant} from "./combinedHistoryProof";

/** Read-only candidate History/Report visualization. Deliberately separate from
 * the accepted 0.1.2 History and Report readers, which remain unchanged.
 * Every source value is assigned via textContent; no workbook data is trusted HTML. */
export function renderCandidateHistoryReview(host:HTMLElement,instants:readonly HistoryInstant[],timeZone:string){
 const doc=host.ownerDocument;
 const node=<K extends keyof HTMLElementTagNameMap>(tag:K,value?:string)=>{
  const e=doc.createElement(tag);if(value!==undefined)e.textContent=value;return e;
 };
 host.replaceChildren();
 if(!instants.length){host.append(node("p","No creation or edit history in this candidate."));return;}
 const days=instants.map(x=>todayInTimeZone(new Date(x.timestampUTC),timeZone)).sort();
 const report=buildCombinedHistoryReport(instants,days[0],days[days.length-1],timeZone);
 const heading=node("h3","Creation history preview");
 const summary=node("p",report.creations+" created entit"+(report.creations===1?"y":"ies")+
  " · "+report.edits+" edit save"+(report.edits===1?"":"s")+
  " · "+report.logicalSaves+" logical transaction"+(report.logicalSaves===1?"":"s")+
  " · "+report.fieldRows+" field audit rows");
 const detail=node("details"),trigger=node("summary","Inspect complete candidate audit evidence");
 detail.append(trigger);
 for(const day of report.days){
  const date=node("section"),dateHeading=node("h4",day.localDay+" ("+timeZone+")");
  date.append(dateHeading);
  for(const instant of day.instants){
   const group=node("div");
   group.append(node("p",historyDisplayTime(instant.timestampUTC,timeZone)+" · UTC "+instant.timestampUTC));
   if(instant.crossSourceTie)group.append(node("p","Creation and edits share an exact UTC timestamp; cross-sheet order is not asserted."));
   const list=node("ul");
   for(const entry of instant.entries){
    const item=node("li");
    if(entry.kind==="create"){
     const head=node("strong","Created "+entry.wbsCode+" · "+entry.taskTitle+" (ID "+entry.taskId+")");
     item.append(head,node("p","Save "+entry.changeSetId+" · Actor "+entry.actorLabel+" (unverified local)"+
      " · "+entry.fields.length+" initial field records"));
     const fieldDetails=node("details"),fieldHeading=node("summary","Initial field snapshot");
     const values=node("ul");
     for(const field of entry.fields)values.append(node("li",field.field+": "+(field.value===""?"(blank)":field.value)+
      " · Event "+field.eventId+" · Audit row "+field.sourceRow));
     fieldDetails.append(fieldHeading,values);item.append(fieldDetails);
    }else{
     const event=entry.event;
     item.append(node("strong","Edited "+event.changes.length+" field(s) · Save "+event.changeSetId));
     const values=node("ul");
     for(const change of event.changes)values.append(node("li",change.wbsCode+" · "+change.taskTitle+
      " ("+change.taskId+") · "+change.field+" · Before "+String(change.oldValue??"(blank)")+
      " → After "+String(change.newValue??"(blank)")));
     item.append(values);
    }
    list.append(item);
   }
   group.append(list);date.append(group);
  }
  detail.append(date);
 }
 host.append(heading,summary,node("p","Candidate-only reconciliation. No workbook saved, loaded or activated."),detail);
}
