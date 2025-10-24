/* eslint-disable import-x/no-extraneous-dependencies */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(dirname, './build');
const pkgJson = require('./package.json');

const external = Object.keys(pkgJson.dependencies || {});
const srcDir = path.dirname(require.resolve('http-parser-js'));

/**
 * @type BuildOptions
 */
const defaultConfig = {
  entryPoints: [require.resolve('http-parser-js')],
  bundle: true,
  platform: 'node',
  target: ['es2022'],
  logLevel: 'info',
  format: 'esm',
  mainFields: ['module', 'main'],
  keepNames: true,
  external,
  banner: {
    js: `
function assertOk(a){
  if (!a)
    throw new TypeError('AssertionError [ERR_ASSERTION]: ' + JSON.stringify(a) + ' == true');
};
function assertEqual(a, b){
  if (a !== b)
    throw new TypeError('AssertionError [ERR_ASSERTION]: ' + JSON.stringify(a) + ' == ' + JSON.stringify(b));
};    
`,
  },
  plugins: [
    {
      name: 'Custom',
      setup(build) {
        build.onLoad({ filter: /.*/ }, args => {
          let contents = fs.readFileSync(args.path, 'utf-8');
          if (contents.includes('assert.')) {
            contents = contents
              .replaceAll("var assert = require('assert');", '')
              .replaceAll('assert.ok(', 'assertOk(')
              .replaceAll('assert.equal(', 'assertEqual(');
          }
          return {
            contents,
          };
        });
      },
    },
  ],
};

await esbuild.build({
  ...defaultConfig,
  outfile: path.join(targetPath, './cjs/index.cjs'),
  format: 'cjs',
});
// await esbuild.build({
//   ...defaultConfig,
//   outfile: path.join(targetPath, './esm/index.mjs'),
//   format: 'esm',
// });
fs.mkdirSync(path.resolve(targetPath, 'types'));
fs.copyFileSync(
  path.resolve(srcDir, 'http-parser.d.ts'),
  path.resolve(targetPath, 'types/index.d.ts'),
);
// fs.copyFileSync(
//   path.resolve(srcDir, 'http-parser.d.ts'),
//   path.resolve(targetPath, 'types/index.d.cts'),
// );
fs.copyFileSync(
  path.resolve(srcDir, 'README.md'),
  path.resolve(targetPath, 'README.md'),
);
fs.writeFileSync(
  path.join(targetPath, 'package.json'),
  JSON.stringify(pkgJson, null, 2),
  'utf-8',
);
