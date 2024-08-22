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
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'jsondiffpatch');
const pkgJson = require('./package.json');

const external = []; // Object.keys(pkgJson.dependencies);
const srcPath = path.dirname(require.resolve('jsondiffpatch'));

const buildTargetCfg = (format, override) => ({
  dir: path.resolve(targetPath, format),
  entryFileNames: '[name].' + (format === 'esm' ? 'mjs' : 'cjs'),
  chunkFileNames: '[name].' + (format === 'esm' ? 'mjs' : 'cjs'),
  format,
  name: 'jsondiffpatch',
  exports: 'named',
  banner: 'globalThis.navigator = globalThis.navigator || {};',
  ...override,
});

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
      () => copyFiles(srcPath, ['**/*.css'], path.join(targetPath, 'esm')),
      () => copyFiles(srcPath, ['**/*.css'], path.join(targetPath, 'cjs')),
      () => copyFiles(srcPath, ['**/*.d.ts'], path.join(targetPath, 'types')),
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
      () =>
        fs.copyFileSync(
          path.resolve(targetPath, './types/index.d.ts'),
          path.resolve(targetPath, './types/index_org.d.ts'),
        ),
      () =>
        fs.copyFileSync(
          path.resolve(dirname, './lib/index.d.ts'),
          path.resolve(targetPath, './types/index.d.ts'),
        ),
      () =>
        fs.copyFileSync(
          path.resolve(dirname, './lib/index.d.ts'),
          path.resolve(targetPath, './types/index.d.cts'),
        ),
      () =>
        fs.copyFileSync(
          path.resolve(targetPath, './types/with-text-diffs.d.ts'),
          path.resolve(targetPath, './types/with-text-diffs.d.cts'),
        ),
      () => {
        const files = glob.sync('./types/formatters/*.d.ts', {
          cwd: targetPath,
          absolute: true,
        });
        for (const file of files) {
          fs.copyFileSync(
            file,
            path.join(
              path.dirname(file),
              path.basename(file, path.extname(file)) + '.cts',
            ),
          );
        }
      },
    ],
    { once: true, exitOnFail: true },
  );
}

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
  output: [buildTargetCfg('esm'), buildTargetCfg('cjs')],
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
