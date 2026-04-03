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

export default {
  input: [path.join(dirname, 'lib/index.mjs')],
  output: [
    {
      dir: targetPath,
      entryFileNames: 'index.js',
      format: 'esm',
      name: 'TypeIs',
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
          path.resolve(require.resolve('type-is'), '../README.md'),
          path.join(targetPath, 'README.md'),
          content =>
            `# @browsery/type-is
Browser compatible "type-is"!

This module bundles [type-is](https://www.npmjs.com/package/type-is) module for browsers!

` + content,
        ),
      // Copy LICENSE from readable-stream
      () => copyFiles(dirname, ['LICENSE', '!node_modules/**'], targetPath),
      // Copy types from @types/readable-stream
      () => copyFiles(path.join(dirname, 'lib'), ['*.d.ts'], targetPath),
    ],
    { once: true, exitOnFail: true },
  );
}
