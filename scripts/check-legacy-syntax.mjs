// Fails when the built scripts use syntax that TV browsers from about 2020
// (Chromium 68: webOS 5, Tizen 5.5) cannot parse. Run after `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  path.join(root, 'dist'),
  path.join(root, 'src/public/vendor/player'),
  path.join(root, 'src/public/js/intro-gate.js'),
  path.join(root, 'src/public/sw.js')
];

const files = targets.flatMap(target => {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { recursive: true })
    .map(name => path.join(target, name))
    .filter(file => file.endsWith('.js') && !file.endsWith('hls.worker.js'));
});

// What Chromium 68 lacks among the syntax a build can still contain.
const problemsOf = (code, sourceType) => {
  const problems = [];
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType, allowHashBang: true });
  walk.full(ast, node => {
    if (node.type === 'ChainExpression') problems.push('optional chaining');
    if (node.type === 'LogicalExpression' && node.operator === '??') problems.push('nullish coalescing');
    if (node.type === 'AssignmentExpression' && ['??=', '||=', '&&='].includes(node.operator)) problems.push(`logical assignment ${node.operator}`);
    if (node.type === 'PropertyDefinition' || node.type === 'PrivateIdentifier' || node.type === 'StaticBlock') problems.push('class fields');
    if (node.type === 'Literal' && typeof node.raw === 'string' && /^\d[\d_]*_\d/.test(node.raw)) problems.push('numeric separator');
    if (node.type === 'Literal' && node.bigint !== undefined) problems.push('BigInt literal');
  });
  return [...new Set(problems)];
};

let failed = 0;
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const sourceType = file.endsWith('intro-gate.js') || file.endsWith('sw.js') ? 'script' : 'module';
  let problems;
  try {
    problems = problemsOf(code, sourceType);
  } catch (error) {
    problems = [`does not parse: ${error.message}`];
  }
  if (problems.length) {
    failed += 1;
    console.error(`${path.relative(root, file)}: ${problems.join(', ')}`);
  }
}

if (!files.length) {
  console.error('Nothing to check: run `npm run build` first.');
  process.exit(1);
}
console.log(failed ? `${failed} of ${files.length} files use syntax Chromium 68 cannot parse.` : `${files.length} files fit Chromium 68.`);
process.exit(failed ? 1 : 0);
