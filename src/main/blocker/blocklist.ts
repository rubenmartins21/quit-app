/**
 * Internal adult content blocklist.
 * Never exposed to the renderer — lives only in the main process.
 */
export const ADULT_DOMAINS: string[] = [
  // Major adult platforms
  "pornhub.com", "www.pornhub.com",
  "xvideos.com", "www.xvideos.com",
  "xnxx.com", "www.xnxx.com",
  "xhamster.com", "www.xhamster.com",
  "redtube.com", "www.redtube.com",
  "youporn.com", "www.youporn.com",
  "tube8.com", "www.tube8.com",
  "spankbang.com", "www.spankbang.com",
  "tnaflix.com", "www.tnaflix.com",
  "porntrex.com", "www.porntrex.com",
  "beeg.com", "www.beeg.com",
  "drtuber.com", "www.drtuber.com",
  "nuvid.com", "www.nuvid.com",
  "txxx.com", "www.txxx.com",
  "hclips.com", "www.hclips.com",
  "hdzog.com", "www.hdzog.com",
  "vporn.com", "www.vporn.com",
  "ok.xxx",
  "4tube.com", "www.4tube.com",
  "faphouse.com", "www.faphouse.com",

  // Social/Reddit-adjacent adult
  "onlyfans.com", "www.onlyfans.com",
  "fansly.com", "www.fansly.com",
  "manyvids.com", "www.manyvids.com",

  // Image boards / content
  "rule34.xxx",
  "gelbooru.com", "www.gelbooru.com",
  "sankakucomplex.com",
  "nhentai.net", "www.nhentai.net",
  "hentaifox.com",
  "hanime.tv",
];

// SafeSearch enforcement via hosts
export const SAFESEARCH_ENTRIES: Array<{ ip: string; domain: string }> = [
  // Force Google SafeSearch
  { ip: "forcesafesearch.google.com", domain: "www.google.com" },
  { ip: "forcesafesearch.google.com", domain: "google.com" },
  // Force Bing SafeSearch
  { ip: "strict.bing.com", domain: "www.bing.com" },
  { ip: "strict.bing.com", domain: "bing.com" },
  // Force YouTube Restricted Mode
  { ip: "restrict.youtube.com", domain: "www.youtube.com" },
  { ip: "restrict.youtube.com", domain: "youtube.com" },
  { ip: "restrict.youtube.com", domain: "m.youtube.com" },
];

// Cloudflare for Families DNS (blocks adult content at DNS level)
export const SAFE_DNS_PRIMARY = "1.1.1.3";
export const SAFE_DNS_SECONDARY = "1.0.0.3";

// Marker used to identify our hosts entries for clean removal
export const HOSTS_MARKER_START = "# QUIT-BLOCKER-START";
export const HOSTS_MARKER_END = "# QUIT-BLOCKER-END";
