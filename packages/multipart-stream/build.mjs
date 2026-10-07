/* eslint-disable import-x/no-extraneous-dependencies */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { filterDependencies } from '../../utils/filter-dependencies.js';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(dirname, './build');
const pkgJson = require('./package.json');

const external = Object.keys(pkgJson.dependencies || {});
const srcDir = path.dirname(require.resolve('multipart-stream'));

/**
 * @type esbuild.BuildOptions
 */
const defaultConfig = {
  entryPoints: [require.resolve('multipart-stream')],
  bundle: true,
  platform: 'node',
  target: ['es2022'],
  logLevel: 'info',
  format: 'esm',
  alias: {
    stream: '@browsery/stream',
  },
  mainFields: ['module', 'main'],
  keepNames: true,
  external: [...external, '@browsery/stream'],
};

await esbuild.build({
  ...defaultConfig,
  outfile: path.join(targetPath, './index.js'),
  format: 'cjs',
});
fs.copyFileSync(
  path.resolve(srcDir, 'README.md'),
  path.resolve(targetPath, 'README.md'),
);
const _pkgJson = filterDependencies(pkgJson, external);
_pkgJson.dependencies = { ..._pkgJson.dependencies, '@browsery/stream': '*' };
fs.writeFileSync(
  path.join(targetPath, 'package.json'),
  JSON.stringify(_pkgJson, null, 2),
  'utf-8',
);
