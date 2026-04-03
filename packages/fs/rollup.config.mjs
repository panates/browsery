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
const targetPath = path.resolve(dirname, './build');
const pkgJson = require('./package.json');

export default {
  input: ['src/fs.mjs'],
  output: [
    {
      dir: targetPath,
      entryFileNames: 'index.js',
      format: 'esm',
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
        fs.writeFileSync(
          path.join(targetPath, 'package.json'),
          JSON.stringify(json, undefined, 2),
          'utf-8',
        );
      },
      // Copy LICENSE from readable-stream
      () => copyFiles(dirname, ['LICENSE', 'README.MD'], targetPath),
    ],
    { once: true, exitOnFail: true },
  );
}
