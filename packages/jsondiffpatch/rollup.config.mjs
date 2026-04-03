import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import clean from '@rollup-extras/plugin-clean';
import colors from 'ansi-colors';
import glob from 'fast-glob';
import { createRequire } from 'module';
import command from 'rollup-plugin-command';
import filesize from 'rollup-plugin-filesize';
import { copyFiles } from '../../utils/copy-files.mjs';
import { filterDependencies } from '../../utils/filter-dependencies.js';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(dirname, './build');
const pkgJson = require('./package.json');

const external = []; // Object.keys(pkgJson.dependencies);
const srcPath = path.dirname(require.resolve('jsondiffpatch'));

export default {
  input: {
    index: path.join(dirname, './lib/index.mjs'),
    'with-text-diffs': path.join(srcPath, './with-text-diffs.js'),
    ...Object.fromEntries(
      glob
        .sync(
          ['./contexts/**/*.js', './filters/**/*.js', './formatters/**/*.js'],
          { cwd: srcPath },
        )
        .map(file => [
          // This remove `src/` as well as the file extension from each
          // file, so e.g. src/nested/foo.js becomes nested/foo
          file.slice(2, file.length - path.extname(file).length),
          // This expands the relative paths to absolute paths, so e.g.
          // src/nested/foo becomes /project/src/nested/foo.js
          path.join(srcPath, file),
        ]),
    ),
  },
  output: [
    {
      dir: targetPath,
      entryFileNames: '[name].js',
      format: 'esm',
      name: 'jsondiffpatch',
      exports: 'named',
      banner: 'if (!globalThis?.navigator) globalThis.navigator = {};',
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
      () => copyFiles(srcPath, ['**/*.css'], targetPath),
      () => copyFiles(srcPath, ['**/*.d.ts'], targetPath),
      () =>
        fs.copyFileSync(
          path.resolve(targetPath, './index.d.ts'),
          path.resolve(targetPath, './index_org.d.ts'),
        ),
      () =>
        fs.copyFileSync(
          path.resolve(dirname, './lib/index.d.ts'),
          path.resolve(targetPath, './index.d.ts'),
        ),
    ],
    { once: true, exitOnFail: true },
  );
}
