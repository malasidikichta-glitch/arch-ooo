// Plugin download URLs — served from R2 via plugins.arch.ooo.
// Bucket: plugin-binaries
// Paths: {plugin}/arch-audio-{plugin}-installer.pkg (mac) / -windows-installer.exe (win)

const R2 = "https://plugins.arch.ooo";
const PLUGINS = ["shard","keys","grain","fmnt","cmpr","eqls","dist","sprd","clpr","dly","dck","void","vrb"];

function linksFor(id) {
  return {
    mac: `${R2}/${id}/arch-audio-${id}-installer.pkg`,
    win: `${R2}/${id}/arch-audio-${id}-windows-installer.exe`,
  };
}

export const LINKS = Object.fromEntries(PLUGINS.map(id => [id, linksFor(id)]));

export function downloadsFor(ids) {
  const out = [];
  for (const id of ids) {
    if (id === "bundle") {
      for (const pid of PLUGINS) {
        out.push({
          product_id: pid, product_name: pid,
          download_mac: LINKS[pid].mac,
          download_win: LINKS[pid].win,
        });
      }
    } else if (LINKS[id]) {
      out.push({
        product_id: id, product_name: id,
        download_mac: LINKS[id].mac,
        download_win: LINKS[id].win,
      });
    }
  }
  return out;
}
