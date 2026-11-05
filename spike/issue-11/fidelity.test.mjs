// Test-only synthetic ExcelJS 4.4.0 feasibility probe. Run from repository root.
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(`${process.cwd()}/package.json`);
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
async function fixture() {
  const w = new ExcelJS.Workbook();
  w.creator = 'Synthetic pilot';
  const s = w.addWorksheet('ProjectWBS');
  s.addTable({name:'Tasks',ref:'A1',headerRow:true,columns:[{name:'ID'},{name:'Title'},{name:'Progress'}],rows:[[1,'Synthetic task',10]]});
  s.getCell('C2').numFmt = '0.00';
  s.getCell('B2').font = {bold:true,color:{argb:'FF112233'}};
  s.getCell('D2').value = {formula:'C2*2',result:20};
  s.getCell('C2').dataValidation = {type:'whole',operator:'between',formulae:[0,100],allowBlank:false};
  w.definedNames.add('ProjectWBS!$C$2','PilotProgress');
  w.addWorksheet('Unrelated').getCell('A1').value = 'Preserve synthetic content';
  w.addWorksheet('UpdateHistory').addRows([['ChangeSetID','Before','After'],['existing',0,10]]);
  return w;
}
async function reload(bytes) { const w = new ExcelJS.Workbook(); await w.xlsx.load(bytes); return w; }
test('synthetic field/history edit preserves enumerated workbook semantics', async () => {
  const w = await reload(await (await fixture()).xlsx.writeBuffer());
  w.getWorksheet('ProjectWBS').getCell('C2').value = 25;
  w.getWorksheet('UpdateHistory').addRow(['pilot-1',10,25]);
  const r = await reload(await w.xlsx.writeBuffer()); const s = r.getWorksheet('ProjectWBS');
  assert.equal(s.getCell('C2').value,25);
  assert.equal(s.getCell('C2').numFmt,'0.00');
  assert.equal(s.getCell('B2').font.bold,true);
  assert.equal(s.getCell('B2').font.color.argb,'FF112233');
  assert.deepEqual(s.getCell('D2').value,{formula:'C2*2',result:20});
  assert.equal(s.getTable('Tasks').name,'Tasks');
  assert.equal(s.getCell('C2').dataValidation.type,'whole');
  assert.deepEqual(s.getCell('C2').dataValidation.formulae,[0,100]);
  assert.deepEqual(r.definedNames.getRanges('PilotProgress').ranges,['ProjectWBS!$C$2']);
  assert.equal(r.getWorksheet('Unrelated').getCell('A1').value,'Preserve synthetic content');
  assert.deepEqual(r.getWorksheet('UpdateHistory').getRow(2).values.slice(1),['existing',0,10]);
  assert.deepEqual(r.getWorksheet('UpdateHistory').getRow(3).values.slice(1),['pilot-1',10,25]);
  assert.equal(r.creator,'Synthetic pilot');
});
test('formula cache is not recalculated by ExcelJS after precedent changes', async () => {
  const w=await fixture(); w.getWorksheet('ProjectWBS').getCell('C2').value=25;
  const r=await reload(await w.xlsx.writeBuffer());
  assert.equal(r.getWorksheet('ProjectWBS').getCell('D2').result,20);
});
test('negative fixture: related custom OOXML part is lost during ExcelJS round trip', async () => {
  const z=await JSZip.loadAsync(await (await fixture()).xlsx.writeBuffer());
  z.file('customXml/item1.xml','<pilot xmlns="urn:synthetic:pilot">preserve-me</pilot>');
  const ct=await z.file('[Content_Types].xml').async('string');
  z.file('[Content_Types].xml',ct.replace('</Types>','<Override PartName="/customXml/item1.xml" ContentType="application/xml"/></Types>'));
  const rel=await z.file('_rels/.rels').async('string');
  z.file('_rels/.rels',rel.replace('</Relationships>','<Relationship Id="rIdPilot" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="customXml/item1.xml"/></Relationships>'));
  const input=await z.generateAsync({type:'nodebuffer'});
  assert.ok((await JSZip.loadAsync(input)).file('customXml/item1.xml'));
  const output=await JSZip.loadAsync(await (await reload(input)).xlsx.writeBuffer());
  assert.equal(output.file('customXml/item1.xml'),null,'Unknown parts are not safely preserved');
});
