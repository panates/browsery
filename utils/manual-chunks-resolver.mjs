import colors from 'ansi-colors';

const localNameRegex = /\/browsery\/build\/([^\/]*)/;
const moduleNameRegex = /\/node_modules\/([^\/]*)/;
const commonjsExternalRegex = /([^?]*)\?commonjs-external$/;

export function manualChunksResolver({ external, exclude }) {
  let i = 0;
  const logged = [];
  external = external || [];
  exclude = exclude || [];
  const excludeAll = [...exclude, external];
  return function manualChunks(id) {
    if (!i++)
      console.log(colors.yellow.bold('======= Processed Packages ====='));
    id = trimZeroChars(id);
    let m;
    let name = (m = localNameRegex.exec(id)) && '@opra/' + m[1];
    if (!name)
      name =
        (m = moduleNameRegex.exec(id) || commonjsExternalRegex.exec(id)) &&
        m[1];
    if (name) {
      const isLogged = logged.includes(name);
      logged.push(name);

      if (external && external.includes(name)) {
        if (!isLogged) console.log(colors.greenBright('External:'), name);
        return;
      }

      if (!excludeAll.includes(name)) {
        if (!isLogged) console.log(colors.yellowBright('Chunked:'), name);
        return name;
      }
      if (!isLogged) console.log(colors.magentaBright('Bundled:'), name);
      return;
    }
    console.log(colors.magentaBright('Bundled:'), id);
  };
}

function trimZeroChars(str) {
  while (str && str.charCodeAt(0) === 0) str = str.substring(1);
  return str;
}
