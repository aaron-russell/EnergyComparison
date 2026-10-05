import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(label, command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', (error) => {
      console.error(`${label} could not start: ${error.message}`);
      resolve(false);
    });
    child.on('exit', (code) => resolve(code === 0));
  });
}

const schemaPassed = await run('schema generation', npm, ['run', 'schema:generate']);
if (!schemaPassed) process.exit(1);

const independentChecks = [
  ['format', npm, ['run', 'format:check']],
  ['lint', npm, ['run', 'lint']],
  ['coverage', npm, ['run', 'test:coverage']],
  // The generated validator is ready, so skip build's prebuild hook to avoid a write race.
  ['build', npm, ['run', 'build', '--ignore-scripts']],
  ['documentation links', process.execPath, ['scripts/check-docs.mjs']],
];
const results = await Promise.all(
  independentChecks.map(([label, command, args]) => run(label, command, args)),
);

if (results.includes(false)) process.exit(1);

const finalChecks = [
  ['headers', npm, ['run', 'headers:check']],
  ['internal links', process.execPath, ['scripts/audit-internal-links.mjs']],
];
const finalResults = await Promise.all(
  finalChecks.map(([label, command, args]) => run(label, command, args)),
);

if (finalResults.includes(false)) process.exit(1);
