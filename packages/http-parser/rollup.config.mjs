import { fileURLToPath } from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import clean from '@rollup-extras/plugin-clean';
import colors from 'ansi-colors';
import fs from 'fs';
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
const targetPath = path.resolve(buildPath, 'http-parser');
const pkgJson = require('./package.json');

const external = Object.keys(pkgJson.dependencies || {});

const intro = `
function assertOk(a){
  if (!a)
    throw new TypeError('AssertionError [ERR_ASSERTION]: ' + JSON.stringify(a) + ' == true');
};
function assertEqual(a, b){
  if (a !== b)
    throw new TypeError('AssertionError [ERR_ASSERTION]: ' + JSON.stringify(a) + ' == ' + JSON.stringify(b));
};
`;

export default {
  input: [require.resolve('http-parser-js')],
  output: [
    {
      dir: path.resolve(targetPath, 'esm'),
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
      format: 'esm',
      name: 'HttpParser',
      intro,
      manualChunks: manualChunksResolver({
        external,
        exclude: ['http-parser-js'],
      }),
    },
    {
      dir: path.resolve(targetPath, 'cjs'),
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
      format: 'cjs',
      name: 'HttpParser',
      intro,
      manualChunks: manualChunksResolver({
        external,
        exclude: ['http-parser-js'],
      }),
    },
  ],
  external,
  plugins: [
    {
      transform(code) {
        if (code.includes('assert.')) {
          code = code
            .replaceAll("var assert = require('assert');", '')
            .replaceAll('assert.ok(', 'assertOk(')
            .replaceAll('assert.equal(', 'assertEqual(');
        }
        return code;
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
        await fs.writeFileSync(
          path.join(targetPath, 'package.json'),
          JSON.stringify(json, undefined, 2),
          'utf-8',
        );
      },
      // Copy README.md
      () =>
        copyTextFile(
          require.resolve('http-parser-js/README.md'),
          path.join(targetPath, 'README.md'),
          content =>
            `# @browsery/http-parser
Browser compatible http-parser!

This module bundles [http-parser-js](https://www.npmjs.com/package/http-parser-js) module for browsers!

` + content,
        ),
      // Copy LICENSE from readable-stream
      () =>
        copyFiles(
          path.dirname(require.resolve('http-parser-js/package.json')),
          ['LICENSE', '!node_modules/**'],
          targetPath,
        ),
      // Copy types from @types/readable-stream
      () =>
        copyFiles(
          path.dirname(require.resolve('http-parser-js/package.json')),
          ['**/*.d.ts', '!node_modules/**'],
          path.join(targetPath, 'types'),
        ),
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
