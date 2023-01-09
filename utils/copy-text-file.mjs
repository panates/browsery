import fs from 'fs/promises';

export async function copyTextFile(srcFile, dstFile, cb) {
  let content = await fs.readFile(srcFile, 'utf-8');
  if (cb)
    content = await cb(content);
  if (content)
    await fs.writeFile(dstFile, content, 'utf-8');
}
