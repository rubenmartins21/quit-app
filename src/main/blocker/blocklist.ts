/**
 * Blocklist — never exposed to renderer.
 * 
 * Estratégia:
 * - Hosts file: bloqueia apenas domínios adultos conhecidos (NÃO CDNs do Reddit/Twitter)
 * - PAC file: bloqueia por URL path (subreddits NSFW, pesquisas adultas no Twitter)
 * - DNS: Cloudflare for Families para bloqueio geral a nível DNS
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
  "beeg.com", "www.beeg.com",
  "drtuber.com", "www.drtuber.com",
  "txxx.com", "www.txxx.com",
  "vporn.com", "www.vporn.com",
  "ok.xxx",
  "onlyfans.com", "www.onlyfans.com",
  "fansly.com", "www.fansly.com",
  "manyvids.com", "www.manyvids.com",
  "chaturbate.com", "www.chaturbate.com",
  "cam4.com", "www.cam4.com",
  "stripchat.com", "www.stripchat.com",
  "bongacams.com", "www.bongacams.com",
  "myfreecams.com", "www.myfreecams.com",
  "rule34.xxx",
  "gelbooru.com", "www.gelbooru.com",
  "nhentai.net", "www.nhentai.net",
  "hentaifox.com", "hanime.tv",
  // RedGifs — quase exclusivamente conteúdo adulto
  "redgifs.com", "www.redgifs.com",
  "i.redgifs.com", "thumbs.redgifs.com",
  "api.redgifs.com", "v3.redgifs.com",
  // Reddit — bloqueado inteiro durante o desafio
  // O PAC file não consegue ver paths HTTPS, então bloqueamos o domínio todo
  "reddit.com", "www.reddit.com",
  "old.reddit.com", "new.reddit.com",
  "oauth.reddit.com", "sh.reddit.com",
  "gateway.reddit.com",
  // Reddit CDNs de media (vídeos e imagens de posts)
  "v.redd.it",
  "i.redd.it",
  "preview.redd.it",
  "external-preview.redd.it",
  // Twitter/X — bloqueado inteiro durante o desafio
  "twitter.com", "www.twitter.com",
  "x.com", "www.x.com",
  "t.co",
  "abs.twimg.com", "pbs.twimg.com", "video.twimg.com",
];

// Cloudflare for Families
export const SAFE_DNS_PRIMARY        = "1.1.1.3";
export const SAFE_DNS_SECONDARY      = "1.0.0.3";
export const SAFE_DNS_PRIMARY_V6     = "2606:4700:4700::1113";
export const SAFE_DNS_SECONDARY_V6   = "2606:4700:4700::1003";

export const HOSTS_MARKER_START = "# QUIT-BLOCKER-START";
export const HOSTS_MARKER_END   = "# QUIT-BLOCKER-END";

/**
 * SafeSearch enforcement via hosts file redirect.
 *
 * Em vez de bloquear (0.0.0.0), redirecionamos para endpoints especiais
 * que forçam o modo seguro nos motores de pesquisa:
 *
 *   Google  → forcesafesearch.google.com (216.239.38.120)
 *   Bing    → strict.bing.com            (204.79.197.220)
 *   YouTube → restrictmoderate.youtube.com (216.239.38.120)
 *
 * Estas entradas são adicionadas ao bloco QUIT-BLOCKER no hosts file
 * SEPARADAS das entradas de bloqueio (0.0.0.0) para não conflituar.
 *
 * Referências:
 *   https://developers.google.com/search/docs/essentials/safesearch
 *   https://help.bing.microsoft.com/#apex/bing/en-US/10002/-1
 *   https://support.google.com/youtube/answer/174084
 */
export const SAFESEARCH_HOSTS_ENTRIES = [
  // Google — força SafeSearch em todos os domínios regionais
  "216.239.38.120 www.google.com",
  "216.239.38.120 google.com",
  "216.239.38.120 www.google.pt",
  "216.239.38.120 www.google.co.uk",
  "216.239.38.120 www.google.fr",
  "216.239.38.120 www.google.de",
  "216.239.38.120 www.google.es",
  "216.239.38.120 www.google.it",
  "216.239.38.120 www.google.com.br",
  "2001:4860:4802:32::78 www.google.com",  // IPv6
  // Bing — força modo estrito
  "204.79.197.220 www.bing.com",
  "204.79.197.220 bing.com",
  // YouTube — força modo restrito
  "216.239.38.120 www.youtube.com",
  "216.239.38.120 youtube.com",
  "216.239.38.120 m.youtube.com",
  "216.239.38.120 youtubei.googleapis.com",
  "216.239.38.120 youtube.googleapis.com",
  "216.239.38.120 www.youtube-nocookie.com",
].join("\n");

// Padrões para Electron webRequest interceptor (apenas dentro do Electron)
// Não inclui CDNs do Reddit/Twitter para não bloquear imagens normais
export const BLOCKED_URL_PATTERNS: string[] = [
  "*://redgifs.com/*",
  "*://*.redgifs.com/*",
];
