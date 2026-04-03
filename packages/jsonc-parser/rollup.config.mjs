import { fileURLToPath } from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
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

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(dirname, './build');
const pkgJson = require('./package.json');

const external = Object.keys(pkgJson.dependencies);
const srcdir = path.dirname(require.resolve('jsonc-parser/package.json'));

export default {
  input: [path.join(srcdir, 'lib/esm/main.js')],
  output: [
    {
      dir: targetPath,
      entryFileNames: 'main.js',
      format: 'esm',
      name: 'jsoncparser',
    },
  ],
  external,
  plugins: [
    clean(targetPath),
    commonjs(),
    strip(),
    filesize(),
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
        fs.writeFileSync(
          path.join(targetPath, 'package.json'),
          JSON.stringify(json, undefined, 2),
          'utf-8',
        );
      },
      // Copy README.md
      () =>
        copyTextFile(
          path.resolve(srcdir, 'README.md'),
          path.join(targetPath, 'README.md'),
          content =>
            `# @browsery/validator
Browser compatible "validator"!

This module bundles [validator](https://www.npmjs.com/package/validator) module for browsers!

` + content,
        ),
      // Copy LICENSE
      () => copyFiles(srcdir, ['LICENSE', '!node_modules/**'], targetPath),
      // Copy types
      () => copyFiles(path.join(srcdir, 'lib/esm'), ['*.d.ts'], targetPath),
    ],
    { once: true, exitOnFail: true },
  );
}
