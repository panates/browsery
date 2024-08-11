import { fileURLToPath } from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import clean from '@rollup-extras/plugin-clean';
import colors from 'ansi-colors';
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
const targetPath = path.resolve(buildPath, 'stream');
const pkgJson = require('./package.json');

const external = Object.keys(pkgJson.dependencies);

export default {
  input: [path.resolve(dirname, 'src/stream.mjs')],
  output: [
    {
      dir: path.resolve(targetPath, 'esm'),
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
      format: 'esm',
      name: 'Stream',
      manualChunks: manualChunksResolver({
        external,
      }),
    },
    {
      dir: path.resolve(targetPath, 'cjs'),
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
      format: 'cjs',
      name: 'Stream',
      manualChunks: manualChunksResolver({
        external,
      }),
    },
  ],
  external,
  plugins: [
    {
      transform(code) {
        if (/\bprocess\b/.test(code)) {
          // console.log('', id);
          return code.replaceAll(
            /require\('process\/?'\)/g,
            "require('process')",
          );
        }
      },
    },
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
    console.warn(colors.yellow(`(!) ${warning.message}`));
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
      // Copy README.md
      () =>
        copyTextFile(
          require.resolve('readable-stream/README.md'),
          path.join(targetPath, 'README.md'),
          content =>
            `# @browsery/stream
Browser compatible NodeJS stream API!

This module bundles [readable-stream](https://www.npmjs.com/package/readable-stream) module for browsers!

` + content,
        ),
      // Copy LICENSE from readable-stream
      () =>
        copyFiles(
          path.dirname(require.resolve('readable-stream/package.json')),
          ['LICENSE', '!node_modules/**'],
          targetPath,
        ),
      // Copy types from @types/readable-stream
      () =>
        copyFiles(
          path.dirname(require.resolve('@types/readable-stream/package.json')),
          ['**/*.d.ts', '!node_modules/**'],
          path.join(targetPath, 'types'),
        ),
    ],
    { once: true, exitOnFail: true },
  );
}
