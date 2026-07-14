import { execFileSync } from 'node:child_process';

const forbiddenPatterns = [
  'createMobileSettings',
  'mobile-settings-panel',
  'mobile-settings-back-button',
  'mobile-settings-header',
  'loadDropdowns',
  'movies-dropdown-menu',
  'series-dropdown-menu',
  'publishers-dropdown-menu'
];

let failed = false;

for (const pattern of forbiddenPatterns) {
  try {
    const output = execFileSync('rg', [
      '-n',
      pattern,
      'src',
      '--glob',
      '!src/public/vendor/**'
    ], { encoding: 'utf8' });

    if (output.trim()) {
      failed = true;
      console.error(`Forbidden legacy pattern found: ${pattern}`);
      console.error(output);
    }
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (failed) {
  process.exit(1);
}

console.log('dead-code report OK — no forbidden legacy patterns found.');
