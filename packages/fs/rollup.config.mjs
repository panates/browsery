import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import clean from '@rollup-extras/plugin-clean';
import fs from 'fs';
import path from 'path';
import command from 'rollup-plugin-command';
import { copyFiles } from '../../utils/copy-files.mjs';
import { filterDependencies } from '../../utils/filter-dependencies.js';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'fs');
const pkgJson = require('./package.json');

export default {
  input: ['src/fs.mjs'],
  output: [
    {
      dir: path.resolve(targetPath, 'esm'),
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
      format: 'esm',
      name: 'Fs',
    },
    {
      dir: path.resolve(targetPath, 'cjs'),
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
      format: 'cjs',
      name: 'Fs',
    },
  ],
  plugins: [clean(targetPath), runCommands()],
};

function runCommands() {
  return command(
    [
      // Copy package.json
      async () => {
        const json = filterDependencies(pkgJson, []);
        await fs.writeFileSync(
          path.join(targetPath, 'package.json'),
          JSON.stringify(json, undefined, 2),
          'utf-8',
        );
      },
      // Copy LICENSE from readable-stream
      () => copyFiles(dirname, ['LICENSE', 'README.MD'], targetPath),
      () =>
        fs.copyFileSync(
          path.resolve(dirname, '../../support/package.cjs.json'),
          path.resolve(targetPath, './cjs/package.json'),
        ),
      () =>
        fs.copyFileSync(
          path.resolve(dirname, '../../support/package.esm.json'),
          path.resolve(targetPath, './esm/package.json'),
        ),
    ],
    { once: true, exitOnFail: true },
  );
}
