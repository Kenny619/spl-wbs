import {describe,it,expect} from "vitest";
import {normalizeGuidedRows} from "../../src/managed/guidedImportNormalize";
const opts={date1904:false,generatedIds:{2:"11111111-1111-4111-8111-111111111111"}};
describe("guided import optional fields",()=>{
 it("retains supported values, including zero sort order",()=>{
 const result=normalizeGuidedRows([{excelRow:2,values:{Title:"Task",Priority:"High",Description:"Description",Updates:"Prior note",SortOrder:0,Modified:"2026-11-19T00:00:00.000Z",ItemURL:"https://pmicloud.sharepoint.com/sites/example"}}],opts);
 expect(result.coreValid).toBe(true);
 expect(result.drafts[0]).toMatchObject({priority:"High",description:"Description",updates:"Prior note",sortOrder:0,modified:"2026-11-19T00:00:00.000Z",itemUrl:"https://pmicloud.sharepoint.com/sites/example"});
 });
 it("requires review of invalid optional fields",()=>{
 const result=normalizeGuidedRows([{excelRow:2,values:{Title:"Task",Priority:5,Description:"=unsafe",SortOrder:"unknown",Modified:"2026-11-19",ItemURL:"https://example.com"}}],opts);
 expect(result.coreValid).toBe(false);
 expect(result.issues.map(i=>i.field)).toEqual(expect.arrayContaining(["Priority","Description","SortOrder","Modified","ItemURL"]));
 });
 it("retains optional blank values rather than inventing data",()=>{
 const result=normalizeGuidedRows([{excelRow:2,values:{Title:"Task"}}],opts);
 expect(result.coreValid).toBe(true);
 expect(result.drafts[0]).toMatchObject({priority:null,description:null,updates:null,sortOrder:null,modified:null,itemUrl:null});
 });
});
