/**
 * Independent CI impact planner. Uncertain impact MUST run full regression.
 * Protected main / ready-to-merge PR checks keep their existing job names.
 */
import {readFileSync,appendFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const critical=/^(?:\.github\/|scripts\/|docs\/verification\/|docs\/specifications\/|docs\/prototypes\/|design\/concepts\/|src\/data\/|src\/main\.ts$|src\/config\/|src\/managed\/(?:directSave|preflight|projectData|workbookCandidate|save|history)|test\/fixtures\/|test\/browser\/release\.spec\.ts)/;
const regularDocs=/^(?:README\.md|CHANGELOG\.md|LICENSE(?:\.md)?|docs\/|design\/|.*\.(?:png|jpe?g|gif|webp|svg|md)$)/i;

function browserFor(file) {
  if(file.startsWith("test/unit/")||file.startsWith("test/verification/"))return [];
  const matched=/^test\/browser\/(baseline|gantt|harness|release|managed)\.spec\.ts$/.exec(file);
  if(matched)return [matched[1]];
  if(file.startsWith("src/managed/"))return ["managed"];
  if(/^src\/ui\/(?:grid|timeline|scale|filters|detail|updates|calendarUi|mount|styles)\./.test(file))
    return ["gantt","baseline"];
  if(file.startsWith("src/model/"))return ["gantt","baseline"];
  if(file.startsWith("src/calendar/"))return ["gantt","harness"];
  if(file.startsWith("src/app/"))return ["gantt","harness","baseline"];
  if(file.startsWith("src/")||file.startsWith("test/browser/")||file.startsWith("test/"))
    return ["full"];
  if(/^(?:index\.html|vite|vitest|playwright|tsconfig|package)/.test(file))
    return ["full"];
  return [];
}
export function classifyCI(files,ctx={}){
  const paths=[...new Set(files.map(f=>f.replaceAll("\\","/")))];
  const docsOnly=paths.length>0&&paths.every(f=>regularDocs.test(f)&&!critical.test(f));
  if(ctx.duplicate&&ctx.eventName==="push"&&ctx.branch!=="main")
    return {tier:"duplicate-pr",fast:false,browser:false,browserScope:"none",packaging:false};
  const protectedMain=ctx.eventName==="push"&&ctx.branch==="main";
  const readyPR=ctx.eventName==="pull_request"&&ctx.baseBranch==="main"&&!ctx.isDraft;
  const dispatch=ctx.eventName==="workflow_dispatch"&&ctx.fullRegression!==false;
  const forced=ctx.forceFull||paths.length===0||paths.includes("UNKNOWN_DIFF")||paths.some(f=>critical.test(f));
  const full=Boolean(protectedMain||readyPR||dispatch||forced);
  const scopes=[...new Set(paths.flatMap(browserFor))];
  const browserScope=full||scopes.includes("full")?"full":
    scopes.filter(s=>["gantt","baseline","harness","release","managed"].includes(s)).join(",")||"none";
  const fast=full||!docsOnly,browser=browserScope!=="none";
  return {tier:full?"full":!fast?"docs-only":browser?"targeted":"fast",
    fast,browser,browserScope,packaging:full&&!docsOnly};
}
function changedFiles(event,name){
  let base,head;
  if(name==="pull_request"){
    base=event.pull_request?.base?.sha;head=event.pull_request?.head?.sha;
  }else if(name==="push"){
    base=event.before;head=process.env.GITHUB_SHA;
  }else return ["UNKNOWN_DIFF"];
  if(!base||!head||/^0+$/.test(base))return ["UNKNOWN_DIFF"];
  try{
    const output=execFileSync("git",["diff","--name-only","--no-renames",base,head],
      {encoding:"utf8",timeout:120000,maxBuffer:2*1024*1024});
    return output.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).sort();
  }catch(e){
    console.warn("Unable to prove changed files: using full regression",e.message);
    return ["UNKNOWN_DIFF"];
  }
}
async function duplicatePR(sha,token){
  if(!sha||!token||!process.env.GITHUB_REPOSITORY)return false;
  try{
    const url="https://api.github.com/repos/"+process.env.GITHUB_REPOSITORY+"/commits/"+sha+"/pulls?per_page=100";
    const res=await fetch(url,{headers:{"Accept":"application/vnd.github+json",
      "Authorization":"Bearer "+token,"User-Agent":"spt-wbs-tiered-ci",
      "X-GitHub-Api-Version":"2022-11-28"},signal:AbortSignal.timeout(10000)});
    if(!res.ok)throw Error("GitHub returned "+res.status);
    const prs=await res.json();
    return Array.isArray(prs)&&prs.some(pr=>pr.state==="open"&&
      pr.base?.ref==="main"&&pr.head?.sha===sha);
  }catch(e){
    console.warn("Duplicate PR not proven; run checks conservatively",e.message);
    return false;
  }
}
async function main(){
  const eventName=process.env.GITHUB_EVENT_NAME||"workflow_dispatch";
  const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,"utf8"));
  const files=changedFiles(event,eventName);
  const branch=process.env.GITHUB_REF_NAME;
  const duplicate=eventName==="push"&&branch?.startsWith("feature/")&&
    await duplicatePR(process.env.GITHUB_SHA,process.env.GH_TOKEN);
  const ctx={eventName,branch,baseBranch:event.pull_request?.base?.ref,
    isDraft:Boolean(event.pull_request?.draft),
    fullRegression:event.inputs?.full_regression!=="false",
    forceFull:/\[full-ci\]/i.test(event.head_commit?.message||event.pull_request?.title||""),
    duplicate};
  const plan=classifyCI(files,ctx);
  const outputs=["fast="+plan.fast,"browser="+plan.browser,
    "browser_scope="+plan.browserScope,"packaging="+plan.packaging].join("\n")+"\n";
  appendFileSync(process.env.GITHUB_OUTPUT,outputs);
  const summary="CI tier: "+plan.tier+"; fast="+plan.fast+"; Windows="+plan.browser+
    "; suites="+plan.browserScope+"; package="+plan.packaging+
    "\nChanged: "+files.slice(0,15).join(", ")+(files.length>15?" + more":"");
  console.log(summary);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+"\n");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(e=>{console.error(e);process.exitCode=1});
}
