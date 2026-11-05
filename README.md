# SPT-WBS — Issue #11 Windows/Edge pilot package (test-only)

**Download:** [SPT-WBS-Issue11-Edge-Pilot.zip](./SPT-WBS-Issue11-Edge-Pilot.zip)

This branch is a **standalone distribution branch**, not an implementation branch and **must never be merged** into `main`. The ZIP contains the browser harness, README and two synthetic .xlsx fixtures. It is intended only for disposable-folder hardware testing associated with [Issue #11](https://github.com/Kenny619/spl-wbs/issues/11).

## Run
1. Download the ZIP from GitHub (click file, then **Download raw file**).
2. Extract all files into an isolated, disposable local folder, for example `C:\Temp\spt-wbs-fs-pilot-01`.
3. In Windows 11 / Microsoft Edge, open `SPT-WBS-Windows-Edge-FS-Pilot.html` using `file://`.
4. Use **Check environment**, **Select disposable test folder**, **Inspect synthetic fixtures**, then **Perform guarded write test**.
5. Copy the onscreen test log. Inspect the synthetic source and its backup in Excel after the test.

**Safety:** Never choose a real work/project folder. The guarded write replaces only the known synthetic source after SHA-256 checks and verified same-directory backup. This is not the final Save implementation or acceptance of FS-01–FS-12.

**Exact ZIP SHA-256:** `0ffc3bfb5c3524d48426e9180ec299449e36ecc7d4c5da4d02e8b51853d76d03`  
**ZIP size:** 12,583 bytes.  
**Git blob SHA-1:** `b7ca23cc438bfc2c4c01d1a68e3a71b9119d8b4c`.

No production feature code, merged PR, or changes to frozen contracts are authorized by distributing this file.
