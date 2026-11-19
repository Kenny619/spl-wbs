import {describe,it,expect} from "vitest";
import {encodeCreateManifest,parseCreateManifest,validateTaskContinuity,MANIFEST_FIELD} from "../../src/managed/b2ContinuityProof";
import {type B2CreateField} from "../../src/managed/b2CreateAuditPlan";
const id="11111111-1111-4111-8111-111111111111",stamp="2026-11-19T00:00:00.000Z";
const change="22222222-2222-4222-8222-222222222222",edit="33333333-3333-4333-8333-333333333333";
const fields:B2CreateField[]=["ID","Title","WBSCode","TaskType"];
const current={ID:id,Title:"A",WBSCode:"1",TaskType:"Task"};
function group(boundary=0){
 const base={ChangeSetID:change,TimestampUTC:stamp,EntityType:"Task" as const,EntityID:id,TaskID:id,Action:"Create" as const,OldValue:"" as const,ActorLabel:"PM",ActorProvenance:"UnverifiedLocal" as const,Source:"Web UI" as const,AppVersion:"test"};
 return [...fields.map((Field,i)=>({...base,EventID:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa"+i,Field,NewValue:current[Field as keyof typeof current]})),{...base,EventID:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",Field:MANIFEST_FIELD as typeof MANIFEST_FIELD,NewValue:encodeCreateManifest(fields,boundary)}];
}
const update={TaskID:id,ChangeSetID:edit,TimestampUTC:stamp,Field:"Title" as const,OldValue:"A",NewValue:"B"};
describe("B2 task-scoped candidate proof",()=>{
 it("accepts canonical manifest and rejects extra keys or unsorted fields",()=>{
 expect(parseCreateManifest(encodeCreateManifest(fields,0))).not.toBeNull();
 expect(parseCreateManifest(JSON.stringify({v:1,fields,historyBoundary:0}))).toBeNull();
 expect(parseCreateManifest('{"v":1,"fields":["ID","TaskType","Title","WBSCode"],"historyBoundary":0,"extra":1}')).toBeNull();
 });
 it("accepts complete initial snapshot",()=>expect(validateTaskContinuity(group(),[],current).ok).toBe(true));
 it("rejects missing fields and duplicate manifests",()=>{
 const g=group();expect(validateTaskContinuity(g.slice(1),[],current).ok).toBe(false);
 expect(validateTaskContinuity([...g,g[4]],[],current).ok).toBe(false);
 });
 it("accepts tied timestamp edits in physical order regardless of UUID sort",()=>{
 const later={...update,ChangeSetID:"00000000-0000-4000-8000-000000000000",OldValue:"B",NewValue:"C"};
 expect(validateTaskContinuity(group(1),[{...update,TaskID:"legacy"},update,later],{...current,Title:"C"}).ok).toBe(true);
 });
 it("rejects prefix intrusion and missing history",()=>{
 expect(validateTaskContinuity(group(1),[update],{...current,Title:"B"}).ok).toBe(false);
 expect(validateTaskContinuity(group(1),[],current).ok).toBe(false);
 });
 it("rejects inconsistent transitions and timestamp regression",()=>{
 expect(validateTaskContinuity(group(),[{...update,OldValue:"X"}],{...current,Title:"B"}).ok).toBe(false);
 expect(validateTaskContinuity(group(),[{...update,TimestampUTC:"2026-11-18T00:00:00.000Z"}],{...current,Title:"B"}).ok).toBe(false);
 });
 it("rejects discontiguous edit block and current snapshot mismatch",()=>{
 expect(validateTaskContinuity(group(),[update,{...update,TaskID:"legacy",ChangeSetID:change},{...update,OldValue:"B",NewValue:"C"}],{...current,Title:"C"}).ok).toBe(false);
 expect(validateTaskContinuity(group(),[],{...current,Title:"B"}).ok).toBe(false);
 });
});
