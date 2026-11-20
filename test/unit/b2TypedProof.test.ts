import {describe,it,expect} from "vitest";
import {planB2TaskCreateAudit,type B2CreateField} from "../../src/managed/b2CreateAuditPlan";
import {encodeCreateManifest,MANIFEST_FIELD} from "../../src/managed/b2ContinuityProof";
import {validateTypedB2Groups,verifyPhysicalPrefix} from "../../src/managed/b2TypedProof";
const id="11111111-1111-4111-8111-111111111111",stamp="2026-11-20T00:00:00.000Z";
const change="22222222-2222-4222-8222-222222222222",edit="33333333-3333-4333-8333-333333333333";
const event=(n:number)=>"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa"+n;
const fields:B2CreateField[]=["ID","Title","WBSCode","TaskType","Progress"];
const values={ID:id,Title:"A",WBSCode:"1",TaskType:"Task",Progress:0};
function group(){
 const p=planB2TaskCreateAudit({taskId:id,changeSetId:change,timestampUTC:stamp,actorLabel:"PM",appVersion:"test",fields,values,eventIds:fields.map((_,i)=>event(i))});
 if(!p.ok)throw Error(p.errors.join(","));
 return [...p.rows,{...p.rows[0],EventID:event(5),Field:MANIFEST_FIELD as typeof MANIFEST_FIELD,NewValue:encodeCreateManifest(fields,0)}];
}
const update={TaskID:id,ChangeSetID:edit,TimestampUTC:stamp,Field:"Progress" as const,OldValue:0,NewValue:25};
describe("B2 typed candidate proof",()=>{
 it("preserves numeric zero and accepts physically typed progress edits",()=>{
  expect(validateTypedB2Groups([group()],[update],new Map([[id,{...values,Progress:25}]])).ok).toBe(true);
 });
 it("rejects string progress in history and coerced current values",()=>{
  expect(validateTypedB2Groups([group()],[{...update,NewValue:"25"}],new Map([[id,{...values,Progress:25}]])).ok).toBe(false);
  expect(validateTypedB2Groups([group()],[],new Map([[id,{...values,Progress:"0"}]])).ok).toBe(false);
 });
 it("rejects malformed or noncanonical Create audit values",()=>{
  const g=group().map(r=>r.Field==="Progress"?{...r,NewValue:"00"}:r);
  expect(validateTypedB2Groups([g],[],new Map([[id,values]])).ok).toBe(false);
 });
 it("rejects reused task groups and existing event identity",()=>{
  const g=group(),current=new Map([[id,values]]);
  expect(validateTypedB2Groups([g,g],[],current).ok).toBe(false);
  expect(validateTypedB2Groups([g],[],current,[g[0].EventID.toUpperCase()]).ok).toBe(false);
 });
 it("rejects inconsistent timestamp within an edit transaction",()=>{
  expect(validateTypedB2Groups([group()],[update,{...update,TaskID:"legacy",TimestampUTC:"2026-11-20T00:00:01.000Z"}],new Map([[id,{...values,Progress:25}]])).ok).toBe(false);
 });
 it("verifies complete prefix, not merely counts or stringified cells",()=>{
  const prefix=[["legacy",0,null],["other",new Date(stamp),true]];
  expect(verifyPhysicalPrefix(prefix,[...prefix,["new",1,null]])).toBe(true);
  expect(verifyPhysicalPrefix(prefix,[["legacy","0",null],prefix[1]])).toBe(false);
  expect(verifyPhysicalPrefix(prefix,[prefix[1],prefix[0]])).toBe(false);
  expect(verifyPhysicalPrefix([[{formula:"1+1",result:2}]],[[{formula:"1+1",result:2}]])).toBe(false);
 });
});
