import { buildManagedCandidate, type CandidateInput, type CandidateResult } from "./workbookCandidate";
import { ManagedWorkbookError } from "./preflight";
import { buildProjectDataCandidate, type ProjectCandidateInput, type ProjectCandidateResult } from "./projectDataCandidate";

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
        !isHash(pending.before) || !isHash(pending.after) ||
        (pending.priorBackup !== null && !isHash(pending.priorBackup)) ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(pending.changeSetId) ||
        hashes.stage !== pending.before) {
        return { status: "STOP", reason: "Unrecognized pending transaction or invalid stage.", hashes };
      }

      // The prior backup ownership is recorded BEFORE a replacement begins.
      // During backup rotation the backup bytes may already be the predecessor
      // while the ownership record still describes the old backup. Both phases
      // are legitimate, but an unknown/malformed/mismatched owner never is.
      let ownerHash: string | null = null;
      if (hashes.owner) {
        let owner: Owner;
        try { owner = parseJson<Owner>(await read(dir, names.owner)); }
        catch { return { status: "STOP", reason: "Pending backup owner metadata cannot be parsed.", hashes }; }
        if (owner.protocol !== PROTOCOL || owner.source !== sourceName ||
            !isHash(owner.backupHash) ||
            (owner.backupHash !== pending.priorBackup && owner.backupHash !== pending.before)) {
          return { status: "STOP", reason: "Pending backup ownership does not match this transaction.", hashes };
        }
        ownerHash = owner.backupHash;
      } else if (pending.priorBackup !== null) {
        return { status: "STOP", reason: "Previously managed backup ownership has disappeared.", hashes };
      }

      const oldBackupTrusted = pending.priorBackup === null
        ? !hashes.backup && !hashes.owner
        : ownerHash === pending.priorBackup && hashes.backup === pending.priorBackup;
      if (hashes.source === pending.before && oldBackupTrusted) {
        return { status: "BEFORE_WRITE", reason: "Original source and verified stage retained; manual reconciliation required.", hashes };
      }
      if (hashes.source === pending.after && hashes.backup === pending.before &&
          (ownerHash === null && pending.priorBackup === null ||
           ownerHash === pending.priorBackup ||
           ownerHash === pending.before)) {
        return { status: "BACKUP_VERIFIED", reason: "Source and predecessor backup verified; cleanup not yet confirmed.", hashes };
      }
      if (hashes.source === pending.after && oldBackupTrusted) {
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
/**
 * One vetted File System Access transaction protocol for task edits and
 * (draft F3c) project-data edits. Only candidate construction differs.
 * A project candidate is always built/validated BEFORE stage/source writes.
 */
type GuardedCandidate = CandidateResult | ProjectCandidateResult;
type CandidateBuilder = (source: Uint8Array) => Promise<GuardedCandidate>;

export async function saveManagedDirect(input: DirectSaveInput): Promise<DirectSaveResult> {
  const { directory, sourceName, loadedHash, ...edit } = input;
  return saveVerifiedCandidate(directory, sourceName, loadedHash,
    (source) => buildManagedCandidate({ ...edit, source }));
}

export type ProjectDirectSaveInput = Omit<ProjectCandidateInput, "source"> & {
  directory: FileSystemDirectoryHandle;
  sourceName: string;
  loadedHash: string;
};

/** F3c draft: explicit verified project-data disk Save; not wired to UI. */
export async function saveManagedProjectDirect(input: ProjectDirectSaveInput): Promise<DirectSaveResult> {
  const { directory, sourceName, loadedHash, ...projectEdit } = input;
  return saveVerifiedCandidate(directory, sourceName, loadedHash,
    (source) => buildProjectDataCandidate({ ...projectEdit, source }));
}

async function saveVerifiedCandidate(
  directory: FileSystemDirectoryHandle,
  sourceName: string,
  loadedHash: string,
  buildCandidate: CandidateBuilder,
): Promise<DirectSaveResult> {
  const names = managedFileNames(sourceName);
  if (!isHash(loadedHash)) stop("MISSING_LOAD_FINGERPRINT", "Load the active workbook before saving.");
  const state = await inspectManagedSave(directory, sourceName);
  if (state.status !== "READY") stop("UNRESOLVED_SAVE", state.reason);
  const predecessor = await read(directory, names.source);
  const before = await sha256(predecessor);
  if (before !== loadedHash) stop("STALE_SOURCE", "The workbook changed since it was loaded; direct Save is blocked.");

  const candidate = await buildCandidate(predecessor);
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

/**
 * Save As v1: create a NEW workbook in the user-selected directory.
 *
 * Candidate always derives from the bytes captured when the user loaded the
 * original, not whatever external writers may have changed in the original
 * since then. The caller must disclose this provenance when saving a conflict.
 * No write is ever made to sourceName here; target must not already exist.
 * Saving a new copy starts a NEW backup lifecycle for future direct Saves.
 */
export type SaveAsManagedInput = Omit<CandidateInput, "source"> & {
  directory: FileSystemDirectoryHandle;
  sourceName: string;
  destinationName: string;
  loadedBytes: Uint8Array;
  loadedHash: string;
};
export type SaveAsManagedResult = {
  kind: "saved-copy";
  sourceName: string;
  destinationName: string;
  destinationHash: string;
  changeSetId: string | null;
};

export async function saveManagedAsCopy(input: SaveAsManagedInput): Promise<SaveAsManagedResult> {
  const { directory, sourceName, destinationName, loadedBytes, loadedHash, ...edits } = input;
  const target = managedFileNames(destinationName);
  managedFileNames(sourceName);
  if (destinationName.toLowerCase() === sourceName.toLowerCase()) {
    stop("SAME_DESTINATION", "Save As requires a new workbook name; the original must remain untouched.");
  }
  if (!isHash(loadedHash) || await sha256(loadedBytes) !== loadedHash) {
    stop("INVALID_LOAD_SNAPSHOT", "Loaded workbook bytes and initial fingerprint do not match.");
  }

  // The selected destination cannot carry any existing source, recovery, or
  // owner state. This also prevents confusing a stale interrupted copy with
  // a new clean Save As.
  for (const name of Object.values(target)) {
    if (await exists(directory, name)) {
      stop("FILE_COLLISION", "Save As refuses existing destination or recovery file: " + name);
    }
  }

  const candidate = await buildManagedCandidate({ ...edits, source: loadedBytes });
  const bytes = candidate.kind === "candidate" ? candidate.bytes : loadedBytes;
  const expected = await sha256(bytes);

  // Stage the complete new workbook before creating the final destination.
  // An error preserves staging evidence; no false success or active-source
  // switch is allowed. Do not auto-retry uncertain files.
  await writeVerified(directory, target.stage, bytes, null);
  await writeVerified(directory, target.source, bytes, null);
  if (await sha256(await read(directory, target.source)) !== expected) {
    stop("READBACK_FAILED", "Save As destination changed after write; staging retained.");
  }
  await directory.removeEntry(target.stage);
  return {
    kind: "saved-copy",
    sourceName,
    destinationName,
    destinationHash: expected,
    changeSetId: candidate.kind === "candidate" ? candidate.changeSetId : null,
  };
}
