import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import {pipeline} from 'stream/promises';
import {fileURLToPath} from 'node:url';
import StreamZip from 'node-stream-zip';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const downloadFile = async (url, path) => pipeline(
    (await fetch(url)).body, fs.createWriteStream(path));

export async function downloadI18next() {
  const tmpDir = path.resolve(dirname, '../tmp');

  await fsp.mkdir(tmpDir, {recursive: true});

  const zipFile = path.join(tmpDir, 'master.zip');
  await downloadFile('https://github.com/i18next/i18next/archive/refs/heads/master.zip', zipFile);

  const zip = new StreamZip.async({file: zipFile});
  const entries = await zip.entries();
  for (const entry of Object.values(entries)) {
    if (entry.isDirectory || !entry.name.startsWith('i18next-master/'))
      continue;
    const name = entry.name.substring(entry.name.indexOf('/') + 1);
    console.log(name);
    if (name.startsWith('src/') || name.startsWith('typescript/') ||
        name === 'package.json' || name === 'LICENSE' || name === 'index.d.ts'
    ) {
      const filename = path.join(tmpDir, name);
      await fsp.mkdir(path.dirname(filename), {recursive: true});
      console.log(entry.name + ' -> ' + path.join(tmpDir, name));
      await zip.extract(entry, path.join(tmpDir, name));
    }
  }
  await zip.close();
}


