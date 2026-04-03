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

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(dirname, './build');
const srcDir = path.dirname(require.resolve('@sindresorhus/slugify'));
const pkgJson = require('./package.json');

const external = Object.keys(pkgJson.dependencies || {});

export default {
  input: [path.join(srcDir, 'index.js')],
  output: [
    {
      dir: targetPath,
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
      format: 'esm',
      name: 'Slugify',
    },
  ],
  external,
  plugins: [
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
        fs.writeFileSync(
          path.join(targetPath, 'package.json'),
          JSON.stringify(json, undefined, 2),
          'utf-8',
        );
      },
      // Copy README.md
      () =>
        copyTextFile(
          require.resolve(srcDir, 'README.md'),
          path.join(targetPath, 'README.md'),
          content =>
            `# @browsery/slugify
Browser compatible slugify!

This module bundles [slugify](https://www.npmjs.com/package/sindresorhus/slugify) module for browsers!

` + content,
        ),
      // Copy LICENSE from readable-stream
      () => copyFiles(srcDir, ['LICENSE', '!node_modules/**'], targetPath),
      // Copy types from @types/readable-stream
      () => copyFiles(srcDir, ['**/*.d.ts', '!node_modules/**'], targetPath),
    ],
    { once: true, exitOnFail: true },
  );
}
