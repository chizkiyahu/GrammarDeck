import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = path.join(rootDir, 'css', 'tailwind.css');

let css = await readFile(cssPath, 'utf8');

css = css.replace(
  /(--tw-shadow-colored:\s*0 0 #0000;\n)/g,
  `$1  --tw-shadow-color: rgb(0 0 0 / 0);
`,
);

const usedCustomProps = new Set(
  Array.from(css.matchAll(/var\((--[\w-]+)/g), ([, name]) => name),
);

css = css.replace(/^\s*(--[\w-]+):\s*;\s*$/gm, (match, name) => (
  usedCustomProps.has(name) ? match : ''
));

css = css.replace(
  /var\(--tw-shadow-color\)/g,
  'var(--tw-shadow-color, rgb(0 0 0 / 0.1))',
);

css = css.replace(/^\s*-o-tab-size:\s*.*\n/gm, '');
css = css.replace(/^\s*-webkit-text-decoration:\s*.*\n/gm, '');
css = css.replace(/(:\s*)0px;/g, '$10;');
css = css.replace(/flex:\s*1 1 0%;/g, 'flex: 1 1 0;');
css = css.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

const header = '/* Generated from css/tailwind.input.css. Do not edit directly. */\n';
if (!css.startsWith('/* Generated from css/tailwind.input.css.')) {
  css = header + css;
}

await writeFile(cssPath, css);

