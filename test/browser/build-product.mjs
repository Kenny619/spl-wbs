import { execFileSync } from 'node:child_process';
// One build per Playwright invocation; failed comparison workers do not rebuild.
export default function buildProduct() {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
}
