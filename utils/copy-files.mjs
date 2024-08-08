import glob from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';

export async function copyFiles(cwd, search, destDir) {
  const files = await glob(search, { cwd });
  // console.log('cwd', cwd);
  // console.log('search', search);
  // console.log('destDir', destDir);
  // console.log(files);
  for (const f of files) {
    const trgFile = path.join(destDir, f);
    await fs.mkdir(path.dirname(trgFile), { recursive: true });
    await fs.copyFile(path.join(cwd, f), trgFile);
  }
}
