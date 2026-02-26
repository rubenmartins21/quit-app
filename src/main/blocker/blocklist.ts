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
  // Nota: Reddit e Twitter CDNs NÃO estão aqui — imagens/vídeos normais devem funcionar
  // O bloqueio de conteúdo adulto no Reddit/Twitter é feito via PAC file por URL path
];

// Cloudflare for Families
export const SAFE_DNS_PRIMARY        = "1.1.1.3";
export const SAFE_DNS_SECONDARY      = "1.0.0.3";
export const SAFE_DNS_PRIMARY_V6     = "2606:4700:4700::1113";
export const SAFE_DNS_SECONDARY_V6   = "2606:4700:4700::1003";

export const HOSTS_MARKER_START = "# QUIT-BLOCKER-START";
export const HOSTS_MARKER_END   = "# QUIT-BLOCKER-END";

// Padrões para Electron webRequest interceptor (apenas dentro do Electron)
// Não inclui CDNs do Reddit/Twitter para não bloquear imagens normais
export const BLOCKED_URL_PATTERNS: string[] = [
  "*://redgifs.com/*",
  "*://*.redgifs.com/*",
];
