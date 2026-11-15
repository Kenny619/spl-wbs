import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {resolve} from "node:path";

const scope=process.env.CI_BROWSER_SCOPE||"full";
const permitted=new Set(["baseline","gantt","harness","release","managed"]);
let files=[];
if(scope!=="full"){
  const requested=scope.split(",").filter(Boolean);
  if(!requested.length||requested.some(x=>!permitted.has(x)))
    throw Error("Unverified CI test mapping: "+scope);
  files=requested.map(x=>"test/browser/"+x+".spec.ts");
  if(files.some(f=>!existsSync(resolve(f))))
    throw Error("Mapped suite missing; do not silently skip tests: "+files.join(","));
}
const cli=resolve("node_modules/@playwright/test/cli.js");
if(!existsSync(cli))throw Error("Playwright CLI is missing");
console.log("CI Windows browser scope:",scope,files.join(",")||"all suites");
const p=spawnSync(process.execPath,[cli,"test",...files,
  "--reporter="+(scope==="full"?"list,html":"list")],
  {stdio:"inherit",env:process.env});
if(p.error)throw p.error;
process.exitCode=p.status??1;
