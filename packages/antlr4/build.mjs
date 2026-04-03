import { fileURLToPath } from 'node:url';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { copyFiles } from '../../utils/copy-files.mjs';
import { filterDependencies } from '../../utils/filter-dependencies.js';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(dirname, './build');
const sourcePath = path.resolve(dirname, 'antlr4');
const pkgJson = require('./package.json');

async function run() {
  await copyFiles(sourcePath, ['README.md'], targetPath);
  await copyFiles(sourcePath, '**/*', targetPath);
  const json = filterDependencies(pkgJson, []);
  fs.writeFileSync(
    path.join(targetPath, 'package.json'),
    JSON.stringify(json, null, 2),
    'utf-8',
  );
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
