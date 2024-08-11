import { fileURLToPath } from 'node:url';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { copyFiles } from '../../utils/copy-files.mjs';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(dirname, '../../build');
const targetPath = path.resolve(buildPath, 'antlr4');
const pkgJson = require('./package.json');

async function run() {
  pkgJson.types = './types/index.d.ts';
  pkgJson.types = './types/index.d.ts';
  pkgJson.exports['.'].types = './types/index.d.ts';
  await copyFiles(
    path.dirname(require.resolve('antlr4')),
    ['**', '!node_modules/**'],
    path.join(targetPath, 'dist'),
  );
  await copyFiles(
    path.resolve('..', path.dirname(require.resolve('antlr4'))),
    ['README.md'],
    targetPath,
  );
  await copyFiles(
    path.resolve(path.dirname(require.resolve('antlr4')), '../src/antlr4'),
    ['**/*.d.{ts,?ts}'],
    path.join(targetPath, 'types'),
  );
  fs.writeFileSync(
    path.join(targetPath, 'package.json'),
    JSON.stringify(pkgJson, null, 2),
    'utf-8',
  );
  fs.renameSync(
    path.join(targetPath, 'types/index.d.cts'),
    path.join(targetPath, 'types/index.d.ts'),
  );
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

//
// export default {
//   input: [
//     path.join(
//       path.dirname(require.resolve('antlr4')),
//       '../src/antlr4/index.web.js',
//     ),
//   ],
//   output: [
//     {
//       dir: path.resolve(targetPath, 'esm'),
//       entryFileNames: 'index.mjs',
//       chunkFileNames: '[name]-[hash].mjs',
//       format: 'esm',
//       name: 'Antlr4',
//       manualChunks: manualChunksResolver({
//         external,
//         exclude: ['antlr4'],
//       }),
//       exports: 'named',
//     },
//     {
//       dir: path.resolve(targetPath, 'cjs'),
//       entryFileNames: 'index.cjs',
//       chunkFileNames: '[name]-[hash].cjs',
//       format: 'cjs',
//       name: 'Antlr4',
//       manualChunks: manualChunksResolver({
//         external,
//         exclude: ['antlr4'],
//       }),
//       exports: 'named',
//     },
//   ],
//   external,
//   plugins: [
//     clean(targetPath),
//     alias({
//       entries: [{ find: 'fs', replacement: '@browsery/fs' }],
//     }),
//     commonjs(),
//     strip(),
//     filesize(),
//     inject({ process: 'process' }),
//     nodeResolve({
//       browser: true,
//       preferBuiltins: false,
//     }),
//     runCommands(),
//   ],
//   onwarn: warning => {
//     if (
//       warning.code === 'CIRCULAR_DEPENDENCY' ||
//       warning.code === 'THIS_IS_UNDEFINED' ||
//       warning.code === 'SOURCEMAP_ERROR'
//     ) {
//       return;
//     }
//     console.warn(colors.yellow(`(!) ${warning.message}`));
//   },
// };
//
// function runCommands() {
//   return command(
//     [
//       // Copy package.json
//       async () => {
//         const json = filterDependencies(pkgJson, external);
//         await fs.writeFile(
//           path.join(targetPath, 'package.json'),
//           JSON.stringify(json, undefined, 2),
//           'utf-8',
//         );
//       },
//       // Copy package.json -> cjs
//       async () => {
//         const json = { type: 'commonjs' };
//         await fs.writeFile(
//           path.join(targetPath, 'cjs', 'package.json'),
//           JSON.stringify(json, undefined, 2),
//           'utf-8',
//         );
//       },
//       // Copy README.md
//       () =>
//         copyTextFile(
//           path.resolve(path.dirname(require.resolve('antlr4')), '../README.md'),
//           path.join(targetPath, 'README.md'),
//           content =>
//             `# @browsery/antlr4
// Browser compatible antlr4!
//
// This module bundles [antlr4](https://www.npmjs.com/package/antlr4) module for browsers!
//
// ` + content,
//         ),
//       // Copy LICENSE
//       () =>
//         copyFiles(
//           path.resolve('..', path.dirname(require.resolve('antlr4'))),
//           ['LICENSE', '!node_modules/**'],
//           targetPath,
//         ),
//       // Copy types
//       () =>
//         copyFiles(
//           path.resolve(
//             path.dirname(require.resolve('antlr4')),
//             '../src/antlr4',
//           ),
//           ['**/*.d.ts', '!node_modules/**'],
//           path.join(targetPath, 'types'),
//         ),
//     ],
//     { once: true, exitOnFail: true },
//   );
// }
