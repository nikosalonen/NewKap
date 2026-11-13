// Plugin homepages and the links in plugin descriptions come from npm, so only web and
// email links may open. Other schemes (file:, app URL schemes) could launch local apps.
const allowedProtocols = new Set(['http:', 'https:', 'mailto:']);

export const isSafeExternalUrl = (url: string) => {
  try {
    return allowedProtocols.has(new URL(url).protocol);
  } catch {
    return false;
  }
};
