import type ExcelJS from "exceljs";
import {resolveWbsSourceField} from "../data/normalize";
import type {B2CreateField} from "./b2CreateAuditPlan";

const canonical:Record<NonNullable<ReturnType<typeof resolveWbsSourceField>>,B2CreateField>={
 id:"ID",taskName:"Title",wbsCode:"WBSCode",parentId:"ParentTaskID",taskType:"TaskType",
 plannedStart:"PlannedStart",plannedEnd:"PlannedEnd",progress:"Progress",status:"TaskStatus",
 owner:"AssignedTo",workstream:"Workstream",sortOrder:"SortOrder",priority:"Priority",
 predecessorIds:"PredecessorIDs",description:"Description",updates:"Updates",modified:"Modified",itemUrl:"ItemURL",
};
/** Strict candidate adapter: normalize only recognized native reader aliases;
 * retain exact physical headers, positions and column presence. Unknown,
 * ambiguous, merged or populated headerless columns fail closed. */
export function mapB2WbsColumns(sheet:ExcelJS.Worksheet):Map<B2CreateField,number>{
 const columns=new Map<B2CreateField,number>();
 sheet.getRow(1).eachCell({includeEmpty:false},(cell,index)=>{
   if(typeof cell.value!=="string"||cell.isMerged)throw Error("invalid-header:"+sheet.name);
   const key=resolveWbsSourceField(cell.value);
   if(!key)throw Error("unsupported-header:"+sheet.name);
   const field=canonical[key];
   if(columns.has(field))throw Error("duplicate-header:"+field);
   columns.set(field,index);
 });
 for(const field of ["ID","Title","WBSCode","TaskType"] as const)
   if(!columns.has(field))throw Error("missing-header:"+field);
 const known=new Set(columns.values());
 sheet.eachRow({includeEmpty:false},(row,index)=>{
   if(index===1)return;
   row.eachCell({includeEmpty:false},(cell,column)=>{
     if(!known.has(column)||cell.isMerged)throw Error("unsupported-cell:"+sheet.name);
   });
 });
 return columns;
}
