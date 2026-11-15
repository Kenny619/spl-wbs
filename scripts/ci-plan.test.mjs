import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {classifyCI,DUPLICATE_PR_BASES,equivalentTriggeredPR,validPreviewHTML} from "./ci-plan.mjs";
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
  assert.equal(p.tier,"targeted");assert.equal(p.browserScope,"gantt,baseline,managed");
});
test("managed display edits select real managed suite",()=>{
  assert.equal(classifyCI(["src/managed/meetingReview.css"],push()).browserScope,"managed");
});
test("save, import, CI, specification and unknown changes fail closed",()=>{
  const paths=["src/managed/directSave.ts","src/data/excelReader.ts",
    ".github/workflows/ci.yml","docs/specifications/EMV.md","src/unmapped/new.ts","scripts/new-build-generator.mjs",
    "src/managed/recoveryUi.ts","src/managed/watchUi.ts","src/managed/watchProjection.ts","src/managed/draft.ts"];
  for(const path of paths)assert.equal(classifyCI([path],push()).browserScope,"full",path);
});
test("shared UI calendar model and boot changes keep managed browser safety coverage",()=>{
  for(const file of ["src/ui/updates.ts","src/ui/grid.ts","src/model/gantt.ts","src/calendar/workdays.ts"]){
    const p=classifyCI([file],push());
    assert.equal(p.browser,true,file);
    assert.ok(p.browserScope.split(",").includes("managed"),file);
  }
  assert.equal(classifyCI(["src/app/bootstrap.ts"],push()).browserScope,"full");
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
test("duplicate feature push cannot suppress explicit full-ci requirement",()=>{
  const forced=classifyCI(["src/ui/grid.ts"],{...push(),duplicate:true,forceFull:true});
  assert.equal(forced.tier,"full");
  assert.equal(forced.fast,true);
  assert.equal(forced.browserScope,"full");
  assert.equal(forced.packaging,true);
  const ordinary=classifyCI(["src/ui/grid.ts"],{...push(),duplicate:true,forceFull:false});
  assert.equal(ordinary.tier,"duplicate-pr");
});
test("manual dispatch with a false flag still fails closed on unknown diff",()=>{
  const plan=classifyCI(["UNKNOWN_DIFF"],{eventName:"workflow_dispatch",fullRegression:false});
  assert.equal(plan.tier,"full");
  assert.equal(plan.browserScope,"full");
});
test("unknown diff defaults full and no false pass",()=>{
  assert.equal(classifyCI([],push()).tier,"full");
  assert.equal(classifyCI(["UNKNOWN_DIFF"],push()).tier,"full");
});
test("explicit release/owner UAT dispatch full",()=>{
  const p=classifyCI(["README.md"],{eventName:"workflow_dispatch",fullRegression:true});
  assert.equal(p.browserScope,"full");
});

test("composite workflow preserves required managed and security checks",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8");
  for(const label of [
    "name: Build + unit tests",
    "name: Browser regression (Windows Chromium)",
    "run: npm run build:managed",
    "run: node verification/security/test-uuid-reachability.mjs",
    "run: node verification/security/uuid-reachability.mjs",
    "run: npm audit --omit=dev --audit-level=high",
    "run: node scripts/package-option-a-integrated-candidate.mjs",
    "run: node scripts/run-browser-tier.mjs",
  ])assert.ok(workflow.includes(label),label);
});
test("synthetic UAT package is opt-in manual full regression, not routine CI",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8");
  assert.match(workflow,/publish_owner_uat:\s*\n\s*description:/);
  assert.match(workflow,/publish_owner_uat:[\s\S]*?default: false/);
  const rule="github.event_name == 'workflow_dispatch' && inputs.publish_owner_uat == true";
  assert.equal(workflow.split(rule).length-1,2);
  assert.equal(workflow.split("needs.plan.outputs.browser_scope == 'full'").length-1,2);
});
test("planner failure falls back to full browser suite with unchanged required names",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8");
  assert.ok(workflow.includes("needs.plan.result != 'success'"));
  assert.ok(workflow.includes("CI_BROWSER_SCOPE:"));
  const browser=readFileSync(new URL("./run-browser-tier.mjs",import.meta.url),"utf8");
  assert.ok(browser.includes('process.env.CI_BROWSER_SCOPE||"full"'));
  assert.ok(browser.includes('scope!=="full"'));
});

test("standalone design HTML and static preview assets skip expensive draft checks",()=>{
  for(const file of ["design/concepts/DES-012-review.html","docs/prototypes/Report-1.1.html","design/concepts/preview.css"]){
    for(const context of [push(),{eventName:"pull_request",baseBranch:"main",isDraft:true}]){
      const plan=classifyCI([file],context);
      assert.equal(plan.tier,"docs-only",file);
      assert.equal(plan.fast,false,file);
      assert.equal(plan.browser,false,file);
    }
  }
});
test("preview-only shortcut is forbidden on main and ready PR or with source changes",()=>{
  for(const file of ["design/concepts/preview.html","docs/prototypes/preview.html"]){
    assert.equal(classifyCI([file],push("main")).browserScope,"full");
    assert.equal(classifyCI([file],{eventName:"pull_request",baseBranch:"main",isDraft:false}).browserScope,"full");
  }
  for(const file of ["design/concepts/helper.js","docs/prototypes/runtime.ts","docs/specifications/EMV.md","src/managed/directSave.ts"]){
    assert.equal(classifyCI([file],push()).browserScope,"full",file);
  }
  assert.equal(classifyCI(["design/concepts/preview.html","src/managed/main.ts"],push()).browserScope,"full");
});
test("preview markup validator rejects malformed standalone HTML",()=>{
  assert.equal(validPreviewHTML('<!doctype html><html><body>Mock</body></html>'),true);
  assert.equal(validPreviewHTML("<html><body>No doctype</body></html>"),false);
  assert.equal(validPreviewHTML("<!doctype html><html><body>Missing close"),false);
});
test("duplicate PR allowlist exactly mirrors configured workflow PR trigger bases",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8");
  const line=workflow.match(/pull_request:\s*\n(?:[^\n]*\n)*?\s*branches: \[([^\]]+)\]/);
  assert.ok(line,"Expected an explicit pull_request base allowlist");
  assert.deepEqual([...DUPLICATE_PR_BASES],line[1].split(",").map(s=>s.trim()));
});
test("feature duplicate requires the exact open PR SHA, source branch, repo and eligible base",()=>{
  const sha="pinned-sha",branch="feature/increment",repo="Kenny619/spl-wbs";
  const pr=(base="main",overrides={})=>({
    state:"open",base:{ref:base},head:{sha,ref:branch,repo:{full_name:repo}},...overrides
  });
  for(const base of DUPLICATE_PR_BASES)
    assert.equal(equivalentTriggeredPR([pr(base)],sha,branch,repo),true,base);
  for(const base of ["feature/unlisted-base","staging","other"])
    assert.equal(equivalentTriggeredPR([pr(base)],sha,branch,repo),false,base);
  assert.equal(equivalentTriggeredPR([pr("main",{state:"closed"})],sha,branch,repo),false);
  assert.equal(equivalentTriggeredPR([pr("main",{head:{sha:"different",ref:branch,repo:{full_name:repo}}})],sha,branch,repo),false);
  assert.equal(equivalentTriggeredPR([pr("main",{head:{sha,ref:"another",repo:{full_name:repo}}})],sha,branch,repo),false);
  assert.equal(equivalentTriggeredPR([pr("main",{head:{sha,ref:branch,repo:{full_name:"fork/repo"}}})],sha,branch,repo),false);
  assert.equal(equivalentTriggeredPR(undefined,sha,branch,repo),false);
});
test("explicit full-ci still overrides a positively matched duplicate",()=>{
  const plan=classifyCI(["design/concepts/mock.html"],{...push(),duplicate:true,forceFull:true});
  assert.equal(plan.browserScope,"full");
  assert.equal(plan.fast,true);
});
