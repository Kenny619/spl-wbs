import { buildManagedCandidate, type CandidateInput, type CandidateResult } from "./workbookCandidate";
import { ManagedWorkbookError } from "./preflight";

const PROTOCOL = "spt-wbs-managed-v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type ManagedFiles = {
  source: string;
  stage: string;
  backup: string;
  owner: string;
  transaction: string;
};
export type ManagedInspection = {
  status: "READY" | "BEFORE_WRITE" | "NEEDS_BACKUP" | "BACKUP_VERIFIED" | "STOP";
  reason: string;
  hashes: Record<string, string>;
};
export type DirectSaveInput = Omit<CandidateInput, "source"> & {
  directory: FileSystemDirectoryHandle;
  sourceName: string;
  /** SHA-256 captured when the active workbook was loaded/reloaded. */
  loadedHash: string;
};
export type DirectSaveResult =
  | { kind: "noop"; sourceHash: string }
  | { kind: "saved"; sourceHash: string; backupHash: string; changeSetId: string };

const stop = (code: string, message: string): never => { throw new ManagedWorkbookError(code, message); };
const isHash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export function managedFileNames(sourceName: string): ManagedFiles {
  if (!/^[^/\\]+\.xlsx$/i.test(sourceName) || /\.(backup|stage)\.xlsx$/i.test(sourceName)) {
    stop("INVALID_FILENAME", "Choose a normal project .xlsx workbook, not a recovery file.");
  }
  const base = sourceName.slice(0, -5);
  return {
    source: sourceName, stage: base + ".stage.xlsx", backup: base + ".backup.xlsx",
    owner: base + ".backup-owner.json", transaction: base + ".pending.json",
  };
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const buffer = new Uint8Array(bytes);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return Array.from(hash, (part) => part.toString(16).padStart(2, "0")).join("");
}

async function exists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") return false;
    throw error;
  }
}

async function read(dir: FileSystemDirectoryHandle, name: string): Promise<Uint8Array> {
  const handle = await dir.getFileHandle(name);
  return new Uint8Array(await (await handle.getFile()).arrayBuffer());
}

/** No overwrite of unknown files; check again as close to createWritable as practical. */
async function writeVerified(
  dir: FileSystemDirectoryHandle,
  name: string,
  contents: Uint8Array,
  expectedExistingHash: string | null,
): Promise<string> {
  const present = await exists(dir, name);
  if (expectedExistingHash === null && present) stop("FILE_COLLISION", "Refusing to overwrite existing file: " + name);
  if (expectedExistingHash !== null) {
    if (!present || await sha256(await read(dir, name)) !== expectedExistingHash) {
      stop("EXTERNAL_CHANGE", "File changed before writing: " + name);
    }
  }
  const handle = await dir.getFileHandle(name, { create: expectedExistingHash === null });
  const writable = await handle.createWritable();
  await writable.write(new Uint8Array(contents));
  await writable.close();
  const observed = await sha256(await read(dir, name));
  const expected = await sha256(contents);
  if (observed !== expected) stop("READBACK_FAILED", "Saved file does not match expected bytes: " + name);
  return observed;
}

type Owner = { protocol: string; source: string; backupHash: string };
type Pending = {
  protocol: string; source: string; before: string; after: string;
  priorBackup: string | null; changeSetId: string;
};
const parseJson = <T>(bytes: Uint8Array): T => JSON.parse(decoder.decode(bytes)) as T;
const jsonBytes = (value: object) => encoder.encode(JSON.stringify(value));

async function verifiedOwner(dir: FileSystemDirectoryHandle, names: ManagedFiles) {
  const backupPresent = await exists(dir, names.backup);
  const ownerPresent = await exists(dir, names.owner);
  if (!backupPresent && !ownerPresent) return null;
  if (!backupPresent || !ownerPresent) stop("UNKNOWN_BACKUP", "Backup/ownership files are missing or unmatched.");
  let owner: Owner;
  try { owner = parseJson<Owner>(await read(dir, names.owner)); }
  catch { return stop("UNKNOWN_BACKUP", "Cannot parse existing backup ownership record."); }
  if (owner.protocol !== PROTOCOL || owner.source !== names.source || !isHash(owner.backupHash)) {
    stop("UNKNOWN_BACKUP", "Existing backup ownership cannot be established.");
  }
  if (await sha256(await read(dir, names.backup)) !== owner.backupHash) {
    stop("BACKUP_CHANGED", "Existing managed backup hash does not match ownership record.");
  }
  return { owner, ownerBytes: await read(dir, names.owner) };
}

/** Read-only state inspection. In uncertain states, never auto-retry or delete recovery files. */
export async function inspectManagedSave(
  dir: FileSystemDirectoryHandle,
  sourceName: string,
): Promise<ManagedInspection> {
  const names = managedFileNames(sourceName);
  const hashes: Record<string, string> = {};
  for (const [kind, filename] of Object.entries(names)) {
    if (await exists(dir, filename)) hashes[kind] = await sha256(await read(dir, filename));
  }
  if (hashes.transaction) {
    try {
      const pending = parseJson<Pending>(await read(dir, names.transaction));
      if (pending.protocol !== PROTOCOL || pending.source !== sourceName ||
        !isHash(pending.before) || !isHash(pending.after) || hashes.stage !== pending.before) {
        return { status: "STOP", reason: "Unrecognized pending transaction or invalid stage.", hashes };
      }
      const own = await (async () => {
        try { return await verifiedOwner(dir, names); } catch { return null; }
      })();
      const trustedBackup = (!hashes.backup && !hashes.owner) ||
        (own !== null && hashes.backup === own.owner.backupHash);
      if (hashes.source === pending.before && trustedBackup) {
        return { status: "BEFORE_WRITE", reason: "Original source and verified stage retained; manual reconciliation required.", hashes };
      }
      if (hashes.source === pending.after && hashes.backup === pending.before) {
        return { status: "BACKUP_VERIFIED", reason: "Source and predecessor backup verified; cleanup not yet confirmed.", hashes };
      }
      if (hashes.source === pending.after && trustedBackup) {
        return { status: "NEEDS_BACKUP", reason: "New source and staged predecessor verified; backup incomplete, do not retry.", hashes };
      }
      return { status: "STOP", reason: "Unexpected or externally changed source/backup; preserve recovery files.", hashes };
    } catch {
      return { status: "STOP", reason: "Pending transaction cannot be parsed or verified.", hashes };
    }
  }
  if (hashes.stage) return { status: "STOP", reason: "Unrecognized orphan staging file.", hashes };
  try {
    await verifiedOwner(dir, names);
    return { status: "READY", reason: "No pending transaction.", hashes };
  } catch {
    return { status: "STOP", reason: "Unknown or changed backup ownership.", hashes };
  }
}

export async function captureManagedSourceHash(
  dir: FileSystemDirectoryHandle,
  sourceName: string,
): Promise<string> {
  const state = await inspectManagedSave(dir, sourceName);
  if (state.status !== "READY") stop("UNRESOLVED_SAVE", state.reason);
  const names = managedFileNames(sourceName);
  if (!await exists(dir, names.source)) stop("MISSING_SOURCE", "Active source workbook is missing.");
  return sha256(await read(dir, names.source));
}

/**
 * Writes to an explicitly selected directory handle; caller MUST have already
 * received user permission. Does not auto-reconcile any uncertain prior save.
 * Source is never reported saved until source AND prior backup readbacks succeed.
 */
export async function saveManagedDirect(input: DirectSaveInput): Promise<DirectSaveResult> {
  const { directory, sourceName, loadedHash, ...edit } = input;
  const names = managedFileNames(sourceName);
  if (!isHash(loadedHash)) stop("MISSING_LOAD_FINGERPRINT", "Load the active workbook before saving.");
  const state = await inspectManagedSave(directory, sourceName);
  if (state.status !== "READY") stop("UNRESOLVED_SAVE", state.reason);
  const predecessor = await read(directory, names.source);
  const before = await sha256(predecessor);
  if (before !== loadedHash) stop("STALE_SOURCE", "The workbook changed since it was loaded; direct Save is blocked.");

  const candidate: CandidateResult = await buildManagedCandidate({ ...edit, source: predecessor });
  if (candidate.kind === "noop") return { kind: "noop", sourceHash: before };
  const after = await sha256(candidate.bytes);
  const priorOwner = await verifiedOwner(directory, names);
  if (await exists(directory, names.stage) || await exists(directory, names.transaction)) {
    stop("UNRESOLVED_SAVE", "Unrecognized pending transaction files are present.");
  }

  await writeVerified(directory, names.stage, predecessor, null);
  const pending: Pending = {
    protocol: PROTOCOL, source: sourceName, before, after,
    priorBackup: priorOwner?.owner.backupHash ?? null, changeSetId: candidate.changeSetId,
  };
  await writeVerified(directory, names.transaction, jsonBytes(pending), null);
  await writeVerified(directory, names.source, candidate.bytes, loadedHash);

  const expectedBackup = priorOwner?.owner.backupHash ?? null;
  await writeVerified(directory, names.backup, predecessor, expectedBackup);
  const owner: Owner = { protocol: PROTOCOL, source: sourceName, backupHash: before };
  await writeVerified(
    directory, names.owner, jsonBytes(owner),
    priorOwner ? await sha256(priorOwner.ownerBytes) : null,
  );
  if (await sha256(await read(directory, names.source)) !== after ||
      await sha256(await read(directory, names.backup)) !== before) {
    stop("READBACK_FAILED", "Source/backup changed after save; recovery files retained.");
  }
  await directory.removeEntry(names.stage);
  await directory.removeEntry(names.transaction);
  return { kind: "saved", sourceHash: after, backupHash: before, changeSetId: candidate.changeSetId };
}
