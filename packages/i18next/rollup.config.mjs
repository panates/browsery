import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import {fileURLToPath} from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import nodeResolve from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import filesize from 'rollup-plugin-filesize';
import command from 'rollup-plugin-command';
import clean from '@rollup-extras/plugin-clean';
import {manualChunksResolver} from '../../utils/manual-chunks-resolver.mjs';
import {copyFiles} from '../../utils/copy-files.mjs';
import {copyTextFile} from '../../utils/copy-text-file.mjs';
import {downloadI18next} from './tools/download-i18next.mjs';
import pkgJson from './package.json' assert {type: 'json'};
import {filterDependencies} from '../../utils/filter-dependencies.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'i18next');

const external = Object.keys(pkgJson.dependencies || {});

const intro = `
function assertOk(a){
  throw new TypeError('AssertionError [ERR_ASSERTION]: ' + JSON.stringify(a) + ' == true');
};
function assertEqual(a, b){
  throw new TypeError('AssertionError [ERR_ASSERTION]: ' + JSON.stringify(a) + ' == ' + JSON.stringify(b));
};
`;

export default async () => {
  await downloadI18next();

  return {
    input: [path.resolve(dirname, 'tmp/src/index.js')],
    output: [
      {
        dir: path.resolve(targetPath, 'esm'),
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name]-[hash].mjs',
        format: 'esm',
        name: 'I18next',
        intro,
        manualChunks: manualChunksResolver({
          external,
          exclude: ['i18next']
        })
      },
      {
        dir: path.resolve(targetPath, 'cjs'),
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name]-[hash].cjs',
        format: 'cjs',
        name: 'I18next',
        intro,
        manualChunks: manualChunksResolver({
          external,
          exclude: ['i18next']
        })
      }
    ],
    external,
    plugins: [
      {
        transform(code) {
          if (code.includes('assert.')) {
            code = code
                .replaceAll('var assert = require(\'assert\');', '')
                .replaceAll('assert.ok(', 'assertOk(')
                .replaceAll('assert.equal(', 'assertEqual(');
          }
          return code;
        }
      },
      clean(targetPath),
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
}

function runCommands() {
  return command([
    // Copy package.json
    async () => {
      const json = filterDependencies(pkgJson, external);
      await fs.writeFile(path.join(targetPath, 'package.json'), JSON.stringify(json, undefined, 2), 'utf-8');
    },
    // Copy README.md
    () => copyTextFile(
        path.resolve(dirname, 'tmp/src/README.md'),
        path.join(targetPath, 'README.md'),
        (content) =>
            `# @browsery/i18next
Browser compatible i18next!

This module bundles [i18next](https://www.npmjs.com/package/i18next) module for browsers!

` +
            content),
    // Copy LICENSE from readable-stream
    () => copyFiles(
        path.resolve(dirname, 'tmp/src'),
        ['LICENSE', '!node_modules/**'],
        targetPath),
    // Copy typings from @types/readable-stream
    () => copyFiles(
        path.resolve(dirname, 'tmp/src'),
        ['**/*.d.ts', '!node_modules/**'],
        path.join(targetPath, 'typings'))
  ], {once: true, exitOnFail: true});
}
