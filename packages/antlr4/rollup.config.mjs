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
import {manualChunksResolver} from '../../utils/manual-chunks-resolver.mjs';
import {copyFiles} from '../../utils/copy-files.mjs';
import {copyTextFile} from '../../utils/copy-text-file.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'antlr4');
import pkgJson from './package.json' assert {type: 'json'};
import {filterDependencies} from '../../utils/filter-dependencies.js';

const require = createRequire(import.meta.url);

const external = Object.keys(pkgJson.dependencies);

export default {
  input: ['src/antlr4.mjs'],
  output: [
    {
      dir: path.resolve(targetPath, 'esm'),
      entryFileNames: '[name].min.mjs',
      format: 'esm',
      name: 'Stream',
      manualChunks: manualChunksResolver({
        external,
        exclude: ['antlr4']
      })
    },
    {
      dir: path.resolve(targetPath, 'cjs'),
      entryFileNames: '[name].min.mjs',
      format: 'cjs',
      name: 'Stream',
      manualChunks: manualChunksResolver({
        external,
        exclude: ['antlr4']
      })
    }
  ],
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
        require.resolve('antlr4/README.md'),
        path.join(targetPath, 'README.md'),
        (content) =>
            `# @browsery/antlr4
Browser compatible antlr4!

This module bundles [antlr4](https://www.npmjs.com/package/antlr4) module for browsers!

` +
            content),
    // Copy LICENSE from readable-stream
    () => copyFiles(
        path.dirname(require.resolve('antlr4/package.json')),
        ['LICENSE', '!node_modules/**'],
        targetPath),
    // Copy typings from @types/readable-stream
    () => copyFiles(
        path.join(path.dirname(require.resolve('antlr4/package.json')), 'src/antlr4'),
        ['**/*.d.ts', '!node_modules/**'],
        path.join(targetPath, 'typings'))
  ], {once: true, exitOnFail: true});
}
