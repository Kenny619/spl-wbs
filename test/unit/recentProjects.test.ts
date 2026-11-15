import { describe, expect, it } from "vitest";
import { rankRecentProjects, RecentProjectStore, type RecentProjectEntry } from "../../src/managed/recentProjects";

function folder(name:string,id:string):FileSystemDirectoryHandle {
  return {name,kind:"directory",id,isSameEntry:async(other:FileSystemHandle)=>
    (other as unknown as {id?:string}).id===id} as unknown as FileSystemDirectoryHandle;
}
function record(dir:FileSystemDirectoryHandle,fileName:string,displayName=fileName):RecentProjectEntry {
  return {directory:dir,fileName,displayName,lastAccess:"2026-11-15T00:00:00.000Z"};
}
describe("Stage A five recent project handles",()=>{
  it("caps to five most recent verified files",async()=>{
    const dir=folder("shared","one");let rows:RecentProjectEntry[]=[];
    for(let i=0;i<6;i++)rows=await rankRecentProjects(rows,record(dir,"p"+i+".xlsx"));
    expect(rows).toHaveLength(5);
    expect(rows.map(x=>x.fileName)).toEqual(["p5.xlsx","p4.xlsx","p3.xlsx","p2.xlsx","p1.xlsx"]);
  });
  it("same-name files in different folders are distinct; identical dir+name moves to top",async()=>{
    const a=folder("Shared","a"),b=folder("Shared","b"),same=folder("Shared","a");
    let rows=await rankRecentProjects([record(a,"plan.xlsx","Original")],record(b,"plan.xlsx","Elsewhere"));
    expect(rows).toHaveLength(2);
    rows=await rankRecentProjects(rows,record(same,"plan.xlsx","New verified name"));
    expect(rows.map(x=>x.displayName)).toEqual(["New verified name","Elsewhere"]);
  });
  it("rejects backup/recovery files and invalid imported metadata",async()=>{
    const dir=folder("Shared","one");
    const rows=await rankRecentProjects([
      record(dir,"~$plan.xlsx"),record(dir,"plan.backup.xlsx"),
      record(dir,"plan.stage.xlsx"),record(dir,"good.xlsx"),
      {...record(dir,"bad.xlsx"),lastAccess:"invalid"}]);
    expect(rows.map(x=>x.fileName)).toEqual(["good.xlsx"]);
  });
  it("degrades safely to page-local memory when IndexedDB is unavailable",async()=>{
    const store=new RecentProjectStore(null);
    expect((await store.load()).persistent).toBe(false);
    const result=await store.remember(record(folder("A","a"),"plan.xlsx","Project Context"));
    expect(result.entries).toHaveLength(1);
    expect(result.persistent).toBe(false);
    expect((await store.load()).entries[0].displayName).toBe("Project Context");
    expect(JSON.stringify(result.entries)).not.toContain("ProjectWBS");
  });
  it("invalid remembered workbook never displaces last good",async()=>{
    const store=new RecentProjectStore(null),dir=folder("A","a");
    await store.remember(record(dir,"good.xlsx"));
    await store.remember(record(dir,"bad.stage.xlsx"));
    expect((await store.load()).entries.map(x=>x.fileName)).toEqual(["good.xlsx"]);
  });
});
