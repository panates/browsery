import { fileURLToPath } from 'node:url';
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
import { filterDependencies } from '../../utils/filter-dependencies.js';
import { manualChunksResolver } from '../../utils/manual-chunks-resolver.mjs';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'jsondiffpatch');
const pkgJson = require('./package.json');

const external = Object.keys(pkgJson.dependencies);

export default {
  input: [
    path.join(
      path.dirname(require.resolve('jsondiffpatch')),
      '../lib/index.js',
    ),
  ],
  output: [
    {
      dir: path.resolve(targetPath, 'esm'),
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
      format: 'esm',
      name: 'jsondiffpatch',
      manualChunks: manualChunksResolver({
        external,
        exclude: ['jsondiffpatch'],
      }),
    },
    {
      dir: path.resolve(targetPath, 'cjs'),
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
      format: 'cjs',
      name: 'jsondiffpatch',
      manualChunks: manualChunksResolver({
        external,
        exclude: ['jsondiffpatch'],
      }),
    },
  ],
  external,
  plugins: [
    // {
    //   transform(code) {
    //     if (code.includes('\'stream\'')) {
    //       code =
    //           code.replaceAll(/require\('stream'\)/g, 'require(\'@browsery/stream\')');
    //     }
    //     return code;
    //   }
    // },
    // alias({
    //   entries: [
    //     { find: 'stream', replacement: '@browsery/stream' },
    //     { find: 'util', replacement: '@browsery/util' },
    //   ],
    // }),
    clean(targetPath),
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
      // Copy typings from @types/readable-stream
      () =>
        copyFiles(
          path.dirname(require.resolve('jsondiffpatch')),
          ['**/*.d.ts'],
          path.join(targetPath, 'typings'),
        ),
    ],
    { once: true, exitOnFail: true },
  );
}
