import path from 'path';
import fs from 'fs/promises';
import {fileURLToPath} from 'node:url';
import command from 'rollup-plugin-command';
import clean from '@rollup-extras/plugin-clean';
import {copyFiles} from '../../utils/copy-files.mjs';
import pkgJson from './package.json' assert {type: 'json'};
import {filterDependencies} from '../../utils/filter-dependencies.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'fs');

export default {
  input: ['src/fs.mjs'],
  output: [{
    dir: path.resolve(targetPath, 'esm'),
    entryFileNames: '[name].mjs',
    format: 'esm',
    name: 'Fs',
  }, {
    dir: path.resolve(targetPath, 'cjs'),
    entryFileNames: '[name].cjs',
    format: 'cjs',
    name: 'Fs',
  }],
  plugins: [
    clean(targetPath),
    runCommands()
  ]
};

function runCommands() {
  return command([
    // Copy package.json
    async () => {
      const json = filterDependencies(pkgJson, []);
      await fs.writeFile(path.join(targetPath, 'package.json'), JSON.stringify(json, undefined, 2), 'utf-8');
    },
    // Copy LICENSE from readable-stream
    () => copyFiles(
        dirname,
        ['LICENSE', 'README.MD'],
        targetPath)
  ], {once: true, exitOnFail: true});
}
