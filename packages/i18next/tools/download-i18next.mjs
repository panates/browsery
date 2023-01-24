import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import {pipeline} from 'stream/promises';
import {fileURLToPath} from 'node:url';
import StreamZip from 'node-stream-zip';
import rimraf from 'rimraf';

const dirname = path.dirname(fileURLToPath(import.meta.url));


const downloadFile = async (url, path) => pipeline(
    (await fetch(url)).body, fs.createWriteStream(path));

export async function downloadI18next() {
  const tmpDir = path.resolve(dirname, '../tmp');
  const srcDir = path.resolve(tmpDir, 'src');

  await rimraf(srcDir);
  await fsp.mkdir(srcDir, {recursive: true});

  const zipFile = path.join(tmpDir, 'master.zip');
  await downloadFile('https://github.com/i18next/i18next/archive/refs/heads/master.zip', zipFile);

  const zip = new StreamZip.async({file: zipFile});
  const entries = await zip.entries();
  for (const entry of Object.values(entries)) {
    console.log(entry.name);
    if (entry.isDirectory)
      continue;
    const m = /^i18next-master\/src\/(.*)/.exec(entry.name) ||
        /^i18next-master\/(package\.json)$/.exec(entry.name) ||
        /^i18next-master\/(LICENSE)$/.exec(entry.name) ||
        /^i18next-master\/(index.d.ts)$/.exec(entry.name);
    if (!m)
      continue;
    await zip.extract(entry, path.join(srcDir, m[1]));
  }
  await zip.close();
}


