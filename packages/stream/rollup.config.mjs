import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import {createRequire} from 'module';
import {fileURLToPath} from 'node:url';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import nodeResolve from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import filesize from 'rollup-plugin-filesize';
import terser from '@rollup/plugin-terser';
import command from 'rollup-plugin-command';
import clean from '@rollup-extras/plugin-clean';
import {manualChunksResolver} from '../../utils/manual-chunks-resolver.mjs';
import {copyFiles} from '../../utils/copy-files.mjs';
import {copyTextFile} from '../../utils/copy-text-file.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'stream');
import pkgJson from './package.json' assert {type: 'json'};

const require = createRequire(import.meta.url);

const external = [
  'abort-controller', 'buffer', 'events', 'process', 'string_decoder',
  'safe-buffer'
];

export default {
  input: ['src/stream.mjs'],
  output: [{
    dir: path.resolve(targetPath, 'esm'),
    entryFileNames: '[name].min.mjs',
    format: 'esm',
    name: 'Stream',
    manualChunks: manualChunksResolver({
      external,
      exclude: ['readable-stream']
    })
  }, {
    dir: path.resolve(targetPath, 'cjs'),
    entryFileNames: '[name].min.mjs',
    format: 'cjs',
    name: 'Stream',
    manualChunks: manualChunksResolver({
      external,
      exclude: ['readable-stream']
    })
  }],
  external,
  plugins: [
    {
      transform(code) {
        if (/\bprocess\b/.test(code)) {
          // console.log('', id);
          return code.replaceAll(/require\('process\/?'\)/g, 'require(\'process\')');
        }
      }
    },
    clean(targetPath),
    terser(),
    commonjs(),
    strip(),
    filesize(),
    inject({process: 'process'}),
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    runCommands()
  ],
  onwarn: (warning) => {
    if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code ===
        'THIS_IS_UNDEFINED' ||
        warning.code === 'SOURCEMAP_ERROR')
      return;
    console.warn(chalk.yellow(`(!) ${warning.message}`));
  }
};

function runCommands() {
  return command([
    // Copy package.json
    async () => {
      const json = {...pkgJson};
      json.dependencies = {};
      json.devDependencies = undefined;
      json.scripts = undefined;
      await fs.writeFile(path.join(targetPath, 'package.json'), JSON.stringify(json, undefined, 2), 'utf-8');
    },
    // Copy README.md
    () => copyTextFile(
        require.resolve('readable-stream/README.md'),
        path.join(targetPath, 'README.md'),
        (content) =>
            `# @browsery/stream
Browser compatible NodeJS stream API!

This module bundles [readable-stream](https://www.npmjs.com/package/readable-stream) module for browsers!

` +
            content),
    // Copy LICENSE from readable-stream
    () => copyFiles(
        path.dirname(require.resolve('readable-stream/package.json')),
        ['LICENSE', '!node_modules/**'],
        targetPath),
    // Copy typings from @types/readable-stream
    () => copyFiles(
        path.dirname(require.resolve('@types/readable-stream/package.json')),
        ['**/*.d.ts', '!node_modules/**'],
        path.join(targetPath, 'typings'))
  ], {once: true, exitOnFail: true});
}
