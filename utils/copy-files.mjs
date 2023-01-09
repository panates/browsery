import path from 'path';
import glob from 'fast-glob';
import fs from 'fs/promises';

export async function copyFiles(cwd, search, destDir) {
  const files = await glob(search, {cwd});
  for (const f of files) {
    const trgFile = path.join(destDir, f);
    await fs.mkdir(path.dirname(trgFile), {recursive: true});
    await fs.copyFile(path.join(cwd, f), trgFile);
  }
}
