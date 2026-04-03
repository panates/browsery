import { fileURLToPath } from 'node:url';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { copyFiles } from '../../utils/copy-files.mjs';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(dirname, './build');
const sourcePath = path.resolve(dirname, 'antlr4');
// const sourcePath = path.resolve(path.dirname(require.resolve('antlr4')), '..');
const pkgJson = require('./package.json');

async function run() {
  await copyFiles(sourcePath, ['README.md'], targetPath);
  await copyFiles(sourcePath, '**/*', targetPath);
  // await copyFiles(
  //   path.resolve(sourcePath, 'src/antlr4'),
  //   ['**/*.d.{ts,?ts}'],
  //   path.join(targetPath, 'types'),
  // );
  // fs.copyFileSync(
  //   path.resolve(sourcePath, './dist/antlr4.node.mjs'),
  //   path.resolve(targetPath, './antlr4.node.mjs'),
  // );
  // fs.copyFileSync(
  //   path.resolve(sourcePath, './dist/antlr4.web.mjs'),
  //   path.resolve(targetPath, './antlr4.web.mjs'),
  // );
  fs.writeFileSync(
    path.join(targetPath, 'package.json'),
    JSON.stringify(pkgJson, null, 2),
    'utf-8',
  );
  // fs.copyFileSync(
  //   path.join(targetPath, 'types/index.d.cts'),
  //   path.join(targetPath, 'types/index.d.ts'),
  // );
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
