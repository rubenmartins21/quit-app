/**
 * Blocklist — never exposed to renderer.
 */

export const ADULT_DOMAINS: string[] = [
  // Major adult platforms
  "pornhub.com",
  "www.pornhub.com",
  "xvideos.com",
  "www.xvideos.com",
  "xnxx.com",
  "www.xnxx.com",
  "xhamster.com",
  "www.xhamster.com",
  "redtube.com",
  "www.redtube.com",
  "youporn.com",
  "www.youporn.com",
  "tube8.com",
  "www.tube8.com",
  "spankbang.com",
  "www.spankbang.com",
  "tnaflix.com",
  "www.tnaflix.com",
  "beeg.com",
  "www.beeg.com",
  "drtuber.com",
  "www.drtuber.com",
  "txxx.com",
  "www.txxx.com",
  "vporn.com",
  "www.vporn.com",
  "ok.xxx",
  "onlyfans.com",
  "www.onlyfans.com",
  "fansly.com",
  "www.fansly.com",
  "manyvids.com",
  "www.manyvids.com",
  "chaturbate.com",
  "www.chaturbate.com",
  "cam4.com",
  "www.cam4.com",
  "stripchat.com",
  "www.stripchat.com",
  "bongacams.com",
  "www.bongacams.com",
  "myfreecams.com",
  "www.myfreecams.com",
  "rule34.xxx",
  "gelbooru.com",
  "www.gelbooru.com",
  "nhentai.net",
  "www.nhentai.net",
  "hentaifox.com",
  "hanime.tv",

  // RedGifs — principal host de GIFs adultos embebidos no Reddit
  "redgifs.com",
  "www.redgifs.com",
  "i.redgifs.com",
  "thumbs.redgifs.com",
  "api.redgifs.com",
  "v3.redgifs.com",

  // Imgur adulto
  "i.imgur.com",

  // Reddit media CDNs — TODOS os subdomínios conhecidos
  "i.redd.it", // imagens diretas
  "v.redd.it", // vídeos
  "preview.redd.it", // previews/miniaturas — causa principal do problema
  "external-preview.redd.it", // previews de links externos
  "i.redditstatic.com", // imagens estáticas do Reddit
  "redditmedia.com",
  "i.redditmedia.com",
  "g.redditmedia.com",
  "styles.redditmedia.com",
  "b.thumbs.redditmedia.com",
  "a.thumbs.redditmedia.com",
  "thumbs.redditmedia.com",

  // Twitter/X media CDNs
  "pbs.twimg.com",
  "video.twimg.com",
  "ton.twimg.com",
];

// Cloudflare for Families — bloqueia adulto a nível DNS
export const SAFE_DNS_PRIMARY = "1.1.1.3";
export const SAFE_DNS_SECONDARY = "1.0.0.3";
// IPv6
export const SAFE_DNS_PRIMARY_V6 = "2606:4700:4700::1113";
export const SAFE_DNS_SECONDARY_V6 = "2606:4700:4700::1003";

export const HOSTS_MARKER_START = "# QUIT-BLOCKER-START";
export const HOSTS_MARKER_END = "# QUIT-BLOCKER-END";

// Padrões para Electron webRequest interceptor
export const BLOCKED_URL_PATTERNS: string[] = [
  "*://redgifs.com/*",
  "*://*.redgifs.com/*",
  "*://preview.redd.it/*",
  "*://external-preview.redd.it/*",
  "*://i.redd.it/*",
  "*://v.redd.it/*",
  "*://*.redditmedia.com/*",
  "*://pbs.twimg.com/*",
  "*://video.twimg.com/*",
];
