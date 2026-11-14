// Shows a path inside the home folder as ~/…, like the tildify package. The
// renderer can't use that package: its bundle replaces node:os with a browser
// version whose homedir() is "/", so nothing was ever shortened.
const tildify = (absolutePath: string, homeDirectory: string) => {
  if (!homeDirectory || homeDirectory === '/') {
    return absolutePath;
  }

  const home = homeDirectory.endsWith('/') ? homeDirectory.slice(0, -1) : homeDirectory;

  if (absolutePath === home) {
    return '~';
  }

  return absolutePath.startsWith(`${home}/`) ? `~${absolutePath.slice(home.length)}` : absolutePath;
};

export default tildify;
