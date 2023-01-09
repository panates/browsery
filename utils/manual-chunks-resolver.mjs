import chalk from 'chalk';

const moduleNameRegex = /\/node_modules\/([^\/]*)/;
const commonjsExternalRegex = /([^?]*)\?commonjs-external$/;

export function manualChunksResolver({external, exclude}) {
  let i = 0;
  const logged = [];
  const excludeAll = [...exclude, external];
  return function manualChunks(id) {
    if (!i++)
      console.log(chalk.yellow.bold('======= Processed Packages ====='));
    id = trimZeroChars(id);
    const m = moduleNameRegex.exec(id) || commonjsExternalRegex.exec(id);
    if (m) {
      const name = m[1];
      const isLogged = logged.includes(m[1]);
      logged.push(m[1]);

      if (external && external.includes(name)) {
        if (!isLogged)
          console.log(chalk.greenBright('External:'), name);
        return;
      }

      if (!excludeAll.includes(name)) {
        if (!isLogged)
          console.log(chalk.yellowBright('Chunked:'), name);
        return name;
      }
      if (!isLogged)
        console.log(chalk.magentaBright('Bundled:'), name);
      return;
    }
    console.log(chalk.magentaBright('Bundled:'), id);
  };
}

function trimZeroChars(str) {
  while (str && str.charCodeAt(0) === 0)
    str = str.substring(1);
  return str;
}
