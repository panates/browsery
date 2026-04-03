import { fileURLToPath } from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import clean from '@rollup-extras/plugin-clean';
import colors from 'ansi-colors';
import glob from 'fast-glob';
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
const srcdir = path.dirname(require.resolve('validator'));

export default {
  input: [path.join(srcdir, 'es/index.js')],
  output: [
    {
      dir: targetPath,
      entryFileNames: 'index.js',
      format: 'esm',
      name: 'Validator',
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
      () =>
        copyFiles(
          path.resolve(srcdir, '../@types/validator'),
          ['*.d.ts'],
          targetPath,
        ),
      // Copy types
      () =>
        copyFiles(
          path.resolve(srcdir, '../@types/validator/lib'),
          ['**/*.d.ts'],
          path.join(targetPath, 'lib'),
        ),
      () => {
        /** Fix esm support in d.ts files */
        const files = glob.sync(path.join(targetPath, 'lib/*.d.ts'));
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          fs.writeFileSync(
            file,
            content.replace(/\.\/"/g, './index.js"'),
            'utf-8',
          );
        }
        const file = path.join(targetPath, 'index.d.ts');
        const content = fs
          .readFileSync(file, 'utf-8')
          .replace(/(from\s+["'])(\.\/[^"']+?)(?<!\.js)(["'])/g, '$1$2.js$3');
        fs.writeFileSync(file, content, 'utf-8');
      },
    ],
    { once: true, exitOnFail: true },
  );
}
