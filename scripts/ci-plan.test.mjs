import test from "node:test";
import assert from "node:assert/strict";
import {classifyCI} from "./ci-plan.mjs";
const push=(branch="feature/work")=>({eventName:"push",branch});
test("docs-only feature push skips expensive jobs",()=>{
  const p=classifyCI(["README.md","docs/guides/example.md"],push());
  assert.equal(p.tier,"docs-only");assert.equal(p.fast,false);assert.equal(p.browser,false);
});
test("protected main always keeps full Windows suite",()=>{
  const p=classifyCI(["README.md"],push("main"));
  assert.equal(p.browserScope,"full");assert.equal(p.fast,true);assert.equal(p.packaging,false);
});
test("non-draft main PR always full",()=>{
  const p=classifyCI(["src/ui/grid.ts"],{eventName:"pull_request",baseBranch:"main",isDraft:false});
  assert.equal(p.browserScope,"full");assert.equal(p.packaging,true);
});
test("draft main PR may target a known Gantt subset",()=>{
  const p=classifyCI(["src/ui/timeline.ts","src/ui/grid.ts"],
    {eventName:"pull_request",baseBranch:"main",isDraft:true});
  assert.equal(p.tier,"targeted");assert.equal(p.browserScope,"gantt,baseline");
});
test("managed display edits select real managed suite",()=>{
  assert.equal(classifyCI(["src/managed/meetingReview.css"],push()).browserScope,"managed");
});
test("save, import, CI, specification and unknown changes fail closed",()=>{
  const paths=["src/managed/directSave.ts","src/data/excelReader.ts",
    ".github/workflows/ci.yml","docs/specifications/EMV.md","src/unmapped/new.ts"];
  for(const path of paths)assert.equal(classifyCI([path],push()).browserScope,"full",path);
});
test("unit-only feature change runs Linux but no Windows",()=>{
  const p=classifyCI(["test/unit/calendar.test.ts"],push());
  assert.equal(p.fast,true);assert.equal(p.browser,false);
});
test("duplicate push only skipped with positive PR evidence",()=>{
  const a=classifyCI(["src/ui/grid.ts"],{...push(),duplicate:true});
  assert.equal(a.tier,"duplicate-pr");assert.equal(a.browser,false);
  const b=classifyCI(["src/ui/grid.ts"],{...push(),duplicate:false});
  assert.equal(b.browser,true);
  assert.equal(classifyCI(["README.md"],{...push("main"),duplicate:true}).tier,"full");
});
test("unknown diff defaults full and no false pass",()=>{
  assert.equal(classifyCI([],push()).tier,"full");
  assert.equal(classifyCI(["UNKNOWN_DIFF"],push()).tier,"full");
});
test("explicit release/owner UAT dispatch full",()=>{
  const p=classifyCI(["README.md"],{eventName:"workflow_dispatch",fullRegression:true});
  assert.equal(p.browserScope,"full");
});
