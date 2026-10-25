import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const fullSet = JSON.parse(readFileSync(join(root, 'node_modules', '@iconify-json', 'lucide', 'icons.json'), 'utf8'));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const used = new Set();
for (const file of walk(srcDir)) {
  if (!/\.(jsx?|tsx?)$/.test(file)) continue;
  const code = readFileSync(file, 'utf8');
  for (const match of code.matchAll(/lucide:([a-z0-9-]+)/g)) used.add(match[1]);
}

const icons = {};
const aliases = {};
const missing = [];

function addIcon(name, seen = new Set()) {
  if (seen.has(name)) return;
  seen.add(name);
  if (fullSet.icons[name]) {
    icons[name] = fullSet.icons[name];
    return;
  }
  const alias = fullSet.aliases?.[name];
  if (alias) {
    aliases[name] = alias;
    addIcon(alias.parent, seen);
    return;
  }
  missing.push(name);
}

for (const name of [...used].sort()) addIcon(name);

const subset = {
  prefix: fullSet.prefix,
  ...(fullSet.width ? { width: fullSet.width } : {}),
  ...(fullSet.height ? { height: fullSet.height } : {}),
  icons,
  ...(Object.keys(aliases).length ? { aliases } : {}),
};

mkdirSync(join(srcDir, 'shared', 'icons'), { recursive: true });
writeFileSync(join(srcDir, 'shared', 'icons', 'lucide-subset.json'), JSON.stringify(subset));
console.log(`Lucide subset: ${Object.keys(icons).length} icons${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
