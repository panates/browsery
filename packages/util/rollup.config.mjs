import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import {createRequire} from 'module';
import {fileURLToPath} from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import nodeResolve from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import filesize from 'rollup-plugin-filesize';
import terser from '@rollup/plugin-terser';
import command from 'rollup-plugin-command';
import clean from '@rollup-extras/plugin-clean';
import {copyFiles} from '../../utils/copy-files.mjs';
import {copyTextFile} from '../../utils/copy-text-file.mjs';
import pkgJson from './package.json' assert {type: 'json'};
import {filterDependencies} from '../../utils/filter-dependencies.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'util');

const require = createRequire(import.meta.url);

const external = Object.keys(pkgJson.dependencies);

export default {
  input: [require.resolve('util')],
  output: [{
    dir: path.resolve(targetPath, 'esm'),
    entryFileNames: '[name].min.mjs',
    format: 'esm',
    name: 'Util'
  }, {
    dir: path.resolve(targetPath, 'cjs'),
    entryFileNames: '[name].min.mjs',
    format: 'cjs',
    name: 'Util'
  }],
  external,
  plugins: [
    clean(targetPath),
    terser(),
    commonjs(),
    strip(),
    filesize(),
    inject({process: 'process'}),
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    runCommands()
  ],
  onwarn: (warning) => {
    if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code ===
        'THIS_IS_UNDEFINED' ||
        warning.code === 'SOURCEMAP_ERROR')
      return;
    console.warn(chalk.yellow(`(!) ${warning.message}`));
  }
};

function runCommands() {
  return command([
    // Copy package.json
    async () => {
      const json = filterDependencies(pkgJson, external);
      await fs.writeFile(path.join(targetPath, 'package.json'), JSON.stringify(json, undefined, 2), 'utf-8');
    },
    // Copy README.md
    () => copyTextFile(
        require.resolve('util/README.md'),
        path.join(targetPath, 'README.md'),
        (content) =>
            `# @browsery/util
Browser compatible NodeJS util API!

This module bundles [util](https://www.npmjs.com/package/util) module for browsers!

` +
            content),
    // Copy LICENSE from util
    () => copyFiles(
        path.dirname(require.resolve('util/package.json')),
        ['LICENSE', '!node_modules/**'],
        targetPath),
    // Copy typings from @types/util
    // () => copyFiles(
    //     path.dirname(require.resolve('@types/readable-stream/package.json')),
    //     ['**/*.d.ts', '!node_modules/**'],
    //     path.join(targetPath, 'typings'))
  ], {once: true, exitOnFail: true});
}
