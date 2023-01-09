import path from 'path';
import fs from 'fs/promises';
import {fileURLToPath} from 'node:url';
import terser from '@rollup/plugin-terser';
import command from 'rollup-plugin-command';
import clean from '@rollup-extras/plugin-clean';
import {copyFiles} from '../../utils/copy-files.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'fs');
import pkgJson from './package.json' assert {type: 'json'};

export default {
  input: ['src/fs.mjs'],
  output: [{
    dir: path.resolve(targetPath, 'esm'),
    entryFileNames: '[name].min.mjs',
    format: 'esm'
  }, {
    dir: path.resolve(targetPath, 'cjs'),
    entryFileNames: '[name].min.mjs',
    format: 'cjs'
  }],
  plugins: [
    clean(targetPath),
    terser(),
    runCommands()
  ]
};

function runCommands() {
  return command([
    // Copy package.json
    async () => {
      const json = {...pkgJson};
      json.dependencies = {};
      json.devDependencies = undefined;
      json.scripts = undefined;
      await fs.writeFile(path.join(targetPath, 'package.json'), JSON.stringify(json, undefined, 2), 'utf-8');
    },
    // Copy LICENSE from readable-stream
    () => copyFiles(
        dirname,
        ['LICENSE', 'README.MD'],
        targetPath)
  ], {once: true, exitOnFail: true});
}
