// Diagnostic UAT bundle only. Does not deploy, release, or approve a baseline.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const manifest = JSON.parse(await readFile('reference/baseline-manifest.json','utf8'));
const reference = await readFile(manifest.candidate.path);
if (createHash('sha256').update(reference).digest('hex') !== manifest.candidate.sha256) {
  throw new Error('Candidate integrity mismatch; no review bundle written.');
}
const product = await readFile('dist/index.html');
const destination = 'work/v18-review';
await mkdir(destination,{recursive:true});
await writeFile(`${destination}/reference-v18.html`, reference);
await writeFile(`${destination}/current-product.html`, product);
execFileSync(process.execPath,['test/browser/write-gantt-fixture.mjs',`${destination}/schedule.xlsx`],{stdio:'inherit'});
await copyFile('spike/v18-review/UAT.md',`${destination}/UAT.md`);
await writeFile(`${destination}/provenance.json`,JSON.stringify({
  purpose:'UNAPPROVED REVIEW PACKAGE — not a release',
  sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  candidate:manifest.candidate,
  productSha256:createHash('sha256').update(product).digest('hex'),
  status:manifest.status,
},null,2)+'\n');
console.log(`Prepared ${destination}: PO target UAT recorded; independent QA and product conformance still required.`);
