# Issue #11 — Browser-compatible recovery protocol candidate

**PROPOSED; not owner-approved product algorithm or independently verified.**

The Python reference model passed eight synthetic model assertions but relied on an OS replace/rename primitive. The File System Access API documents directory `getFileHandle({create:true})`, `removeEntry()`, and file `createWritable()` whose writes become visible at `close()` (typically staged through implementation-defined temporary files). It does not establish multi-file atomic transactions or a guaranteed rename primitive.

## Proposed state machine

1. Preflight original OOXML and complete candidate in memory; verify external-source digest, permissions, and same-directory handle. Establish known managed backup/staging ownership, or fail closed. Refuse to consume a pre-existing unknown staging file.
2. Read the unmodified source bytes. Create a new uniquely identified **staging recovery file** beside the source; write, close, reopen and SHA-256 verify the full source copy. Do not modify the existing managed backup yet.
3. Recheck the live source digest immediately before attempting candidate write. If changed, stop with stage intact pending safe cleanup/reconciliation, not automatic overwrite.
4. Open a writable stream for the source, write the *fully serialized and semantically validated* candidate, close and read back. After a possibly ambiguous close, reconstruct which bytes are persisted before any retry; never append duplicate history.
5. After the candidate is verified, use `createWritable()` on the **managed backup file** to write the verified predecessor bytes from the staging file, close and independently read back. Keep the verified staging file until the managed backup is verified. Never delete the previous backup first. Record any mismatch as requiring recovery, not success.
6. When source and managed backup are both verified, clean up the owned staging file. After cleanup, exactly one managed prior-version backup remains in steady state. If cleanup fails, show a transparent *completed save with residual recovery-stage artifact* only after source/backup verification; investigate whether a failure warrants blocking or requiring user acknowledgement.

## Open safety risks

- The browser stream's `close()` behavior is not a durable, power-loss-safe multi-file commit. There is a window in which the source is updated but the managed backup still represents an older predecessor, with the recovery staging file as the only current predecessor copy.
- Between verification and writing the source, external edits may race; `mode:'exclusive'` only addresses competing writable streams where supported, **not** universal Excel cross-process locking.
- A pre-existing same-named backup may be unrelated. Never treat a filename alone as ownership proof. Establish and verify managed identity and migration/collision rule before overwriting.
- Browser termination can leave staging files. On reopen, reconcile identities, old/new source hashes, backup, and staging before writing. Avoid silent deletion and expose guided recovery.
- Time, space and quota failures for a full-workbook backup must block direct Save before original source replacement. Some other failures after replacing source may be irreversibly ambiguous.
- Optional `mode:'exclusive'` needs runtime compatibility checks; default `siloed` can permit multiple tab writers with last-closed wins.

## Required independent verification

Run controlled file:// Windows/Edge FS-08/09/07/06 tests with synthetic files: each close/write/readback failure stage, second-tab concurrent writers, Excel locks, existing unrelated backup, artificial partial writes, multi-save backup rotation, process termination, permission loss, same-directory sync folders where supported, and recovery after restart. Keep evidence of exact bytes/hashes. For FS-10 separately execute ExcelJS/OOXML semantic round-trip and actual desktop Excel reopen. The existing owner smoke-test activity remains closed; do not claim these cases have been run.

## Sources

- MDN FileSystemFileHandle.createWritable: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable
- MDN FileSystemDirectoryHandle.getFileHandle: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle
- MDN FileSystemDirectoryHandle: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle