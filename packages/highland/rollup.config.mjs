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
const targetPath = path.resolve(buildPath, 'highland');
import pkgJson from './package.json' assert {type: 'json'};

const require = createRequire(import.meta.url);

const external = Object.keys(pkgJson.dependencies);

export default {
  input: ['src/highland.mjs'],
  output: [
    {
      dir: path.resolve(targetPath, 'esm'),
      entryFileNames: '[name].min.mjs',
      format: 'esm',
      name: 'Stream',
      manualChunks: manualChunksResolver({
        external,
        exclude: ['highland']
      })
    },
    {
      dir: path.resolve(targetPath, 'cjs'),
      entryFileNames: '[name].min.mjs',
      format: 'cjs',
      name: 'Stream',
      manualChunks: manualChunksResolver({
        external,
        exclude: ['highland']
      })
    }
  ],
  external,
  plugins: [
    {
      transform(code) {
        if (code.includes('\'stream\'')) {
          code =
              code.replaceAll(/require\('stream'\)/g, 'require(\'@browsery/stream\')');
        }
        return code;
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
        require.resolve('highland/README.md'),
        path.join(targetPath, 'README.md'),
        (content) =>
            `# @browsery/highland
Browser compatible highland!

This module bundles [highland](https://www.npmjs.com/package/highland) module for browsers!

` +
            content),
    // Copy LICENSE from readable-stream
    () => copyFiles(
        path.dirname(require.resolve('highland/package.json')),
        ['LICENSE', '!node_modules/**'],
        targetPath),
    // Copy typings from @types/readable-stream
    () => copyFiles(
        path.dirname(require.resolve('@types/highland/package.json')),
        ['**/*.d.ts', '!node_modules/**'],
        path.join(targetPath, 'typings'))
  ], {once: true, exitOnFail: true});
}
