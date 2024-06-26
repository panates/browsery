import { fileURLToPath } from 'node:url';
import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import clean from '@rollup-extras/plugin-clean';
import chalk from 'chalk';
import fs from 'fs/promises';
import { createRequire } from 'module';
import path from 'path';
import command from 'rollup-plugin-command';
import filesize from 'rollup-plugin-filesize';
import { copyFiles } from '../../utils/copy-files.mjs';
import { copyTextFile } from '../../utils/copy-text-file.mjs';
import { filterDependencies } from '../../utils/filter-dependencies.js';
import { manualChunksResolver } from '../../utils/manual-chunks-resolver.mjs';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'antlr4');
const pkgJson = require('./package.json');

const external = Object.keys(pkgJson.dependencies || {});

export default {
  input: [
    path.join(
      path.dirname(require.resolve('antlr4')),
      '../src/antlr4/index.web.js',
    ),
  ],
  output: [
    {
      dir: path.resolve(targetPath, 'esm'),
      entryFileNames: 'index.mjs',
      chunkFileNames: '[name]-[hash].mjs',
      format: 'esm',
      name: 'Antlr4',
      manualChunks: manualChunksResolver({
        external,
        exclude: ['antlr4'],
      }),
      exports: 'named',
    },
    {
      dir: path.resolve(targetPath, 'cjs'),
      entryFileNames: 'index.cjs',
      chunkFileNames: '[name]-[hash].cjs',
      format: 'cjs',
      name: 'Antlr4',
      manualChunks: manualChunksResolver({
        external,
        exclude: ['antlr4'],
      }),
      exports: 'named',
    },
  ],
  external,
  plugins: [
    clean(targetPath),
    alias({
      entries: [{ find: 'fs', replacement: '@browsery/fs' }],
    }),
    commonjs(),
    strip(),
    filesize(),
    inject({ process: 'process' }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    runCommands(),
  ],
  onwarn: warning => {
    if (
      warning.code === 'CIRCULAR_DEPENDENCY' ||
      warning.code === 'THIS_IS_UNDEFINED' ||
      warning.code === 'SOURCEMAP_ERROR'
    ) {
      return;
    }
    console.warn(chalk.yellow(`(!) ${warning.message}`));
  },
};

function runCommands() {
  return command(
    [
      // Copy package.json
      async () => {
        const json = filterDependencies(pkgJson, external);
        await fs.writeFile(
          path.join(targetPath, 'package.json'),
          JSON.stringify(json, undefined, 2),
          'utf-8',
        );
      },
      // Copy package.json -> cjs
      async () => {
        const json = { type: 'commonjs' };
        await fs.writeFile(
          path.join(targetPath, 'cjs', 'package.json'),
          JSON.stringify(json, undefined, 2),
          'utf-8',
        );
      },
      // Copy README.md
      () =>
        copyTextFile(
          path.resolve(path.dirname(require.resolve('antlr4')), '../README.md'),
          path.join(targetPath, 'README.md'),
          content =>
            `# @browsery/antlr4
Browser compatible antlr4!

This module bundles [antlr4](https://www.npmjs.com/package/antlr4) module for browsers!

` + content,
        ),
      // Copy LICENSE
      () =>
        copyFiles(
          path.resolve('..', path.dirname(require.resolve('antlr4'))),
          ['LICENSE', '!node_modules/**'],
          targetPath,
        ),
      // Copy typings
      () =>
        copyFiles(
          path.resolve(
            path.dirname(require.resolve('antlr4')),
            '../src/antlr4',
          ),
          ['**/*.d.ts', '!node_modules/**'],
          path.join(targetPath, 'typings'),
        ),
    ],
    { once: true, exitOnFail: true },
  );
}
