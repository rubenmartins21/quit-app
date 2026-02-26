/**
 * PAC file server — serve um Proxy Auto-Config file em localhost:7777
 * Bloqueia URLs por path sem precisar de certificado SSL.
 * Funciona em Chrome, Edge, IE. Firefox requer configuração manual.
 */

import http from "http";

const PAC_PORT = 7777;
let server: http.Server | null = null;

// ── Subreddits bloqueados por nome exato ─────────────────────────────────────
const BLOCKED_SUBREDDITS = [
  // Lista original
  "nsfw", "gonewild", "porn", "sex", "hentai", "rule34",
  "realgirls", "cumsluts", "holdthemoan", "girlsfinishingthejob",
  "chickflixxx", "dirtyr4r", "onlyfansreview", "sexygirls",
  "amateur", "nude", "naked", "ass", "boobs", "tits",
  "gonewildstories", "watchitfortheplot", "sexybutnotporn",
  "realasians", "latinas", "ebony", "petitegonewild",
  "18_19", "collegesluts", "nsfw_gif", "nsfw_videos",
  // Adicionados
  "pornhub", "redtube", "xvideos", "clipcake",
  "pornstar", "pornstarvideos", "pornstarx", "pornstarsluts",
  "pornstarfuck", "pornstarlesbians", "pornstargirls", "pornstarbabes",
  "pornstarmodels", "pornstaramatures", "pornstarcompilation",
  "pornstarcompilations", "pornstaronlyfans", "pornstaronly",
  "pornstaronlyfansleak", "pornstarleaks", "pornstarleak",
  "pornstarleaksex", "pornstarleakpics", "pornstarhub",
  "pornhdb", "pornhdb2", "pornhdb3", "pornhdgallery", "pornhdclips",
  "pornhd", "nudeshots", "nudeworld", "nudelife", "nudeteens",
  "teensgonewild", "teenporn", "teensex", "teenhotties", "teenbabes",
  "porncomics", "pornart", "pornartwork", "pornillustration",
  "pornartists", "pornartlovers", "pornhentai", "pornhentais",
  "hentaiporn", "rule63", "rule34hentai", "rule34xxx", "pornrule34",
  "pornhunks", "pornboys", "pornmales", "pornmen",
  "gayporn", "gaynaked", "gaysex", "gayhentai", "gayxxx",
  "pornalt", "pornaltart", "pornaltartwork", "pornalters", "pornaltpride",
  "pornoverflow", "pornhelp", "pornquestions", "pornreview",
  "pornreviews", "pornrate", "pornleaks", "pornleak", "leakporn",
  "nudelooking", "nudeleak", "nudeteenleak",
  "pornhumor", "pornjokes", "pornmemes", "pornmeme",
  "pornmemeart", "pornmemesdaily",
  "pornwallpaper", "pornwallpapers", "pornbackground", "pornwallpaperhq",
  "pornmuse", "pornholic", "pornaddict", "pornjunkie",
  "pornslut", "pornsluts", "pornslutsofnet", "pornslutsclub",
  "realboobs", "realnudes", "realnudelooks", "realteenporn",
  "gonewildteen", "gonewildcollege", "gonewildmilf",
  "gonewildbbw", "gonewildasian", "gonewildlatina",
  "gonewildhentai", "gonewildhentais",
  "18plus", "legalporn", "legalxxx",
  "bondage", "bdsmporn", "bdsmsex", "bdsmnude",
  "milfmemes", "milfart", "milfxxx", "milfporn", "milfonlyfans",
  "bbw", "threesome", "gangbang", "groupsex", "orgy", "pornparty",
  "fap", "faptime", "fapathon", "fapfap",
];

// ── Palavras-chave em nomes de subreddits ────────────────────────────────────
const ADULT_KEYWORDS = [
  // Lista original
  "nsfw", "porn", "xxx", "nude", "naked", "gonewild",
  "hentai", "rule34", "sex", "erotic", "fetish",
  "onlyfans", "milf", "anal", "boob", "tit", "ass",
  // Adicionadas
  "rule63", "creampie", "panties", "lingerie", "pantyhose",
  "stockings", "fishnet", "latex", "bondage", "bdsm",
  "cuck", "bbw", "threesome", "gangbang", "groupsex", "orgy",
  "pornstar", "pornhub", "xvideos", "redtube", "fap",
  "leak", "nudepic", "nudephoto", "nudity", "booty",
  "sexting", "gayporn", "gaynaked", "gaysex", "gayhentai",
  "legalporn", "legalxxx",
];

// ── Paths específicos do Twitter/X ───────────────────────────────────────────
const BLOCKED_TWITTER_PATHS = [
  // Lista original
  "/i/timeline",
  "/search?q=nsfw",
  "/search?q=porn",
  "/search?q=nude",
  "/search?q=sex",
  "/search?q=%23nsfw",
  "/search?q=%23porn",
  // Adicionados
  "/search?q=boobs", "/search?q=tits", "/search?q=ass",
  "/search?q=boob", "/search?q=cum", "/search?q=slut",
  "/search?q=hentai", "/search?q=rule34", "/search?q=gonewild",
  "/search?q=onlyfans", "/search?q=nudes", "/search?q=nudepic",
  "/search?q=nudephotos", "/search?q=nudity", "/search?q=xxx",
  "/search?q=pornstar", "/search?q=sexting",
  "/search?q=bdsm", "/search?q=creampie", "/search?q=panties",
  "/search?q=lingerie", "/search?q=stockings", "/search?q=bondage",
  "/search?q=anal", "/search?q=blowjob", "/search?q=cock",
  "/search?q=facesitting",
];

// ── Keywords de pesquisa no Twitter ─────────────────────────────────────────
const TWITTER_SEARCH_KEYWORDS = [
  // Lista original
  "nsfw", "porn", "nude", "naked", "sex", "xxx",
  "onlyfans", "hentai", "rule34", "gonewild",
  // Adicionadas
  "nudes", "nudepic", "nudephotos", "nudity",
  "boob", "boobs", "tits", "tit", "ass", "booty",
  "panties", "lingerie", "sexting",
  "milf", "milfs", "bbw", "ebony", "latina", "latinas",
  "pornstar", "pornstars", "pornstaronlyfans", "pornstarleak",
  "onlyfansleak", "onlyfansleaks",
  "gonewildstories", "gonewildteen", "gonewildcollege",
  "pornhub", "xvideos", "redtube", "pornvideo", "pornvideos",
  "pornclips", "pornhdb", "pornhd",
  "gayporn", "gayhentai", "gayxxx",
  "pornleaks", "pornleak", "pornmemes", "pornart",
  "rule63", "creampie", "bondage", "bdsm", "anal", "blowjob",
  "facesitting", "cum", "slut", "cock",
];

function buildPacScript(): string {
  return `
function FindProxyForURL(url, host) {
  var lowerUrl = url.toLowerCase();
  var lowerHost = host.toLowerCase();

  var blockedSubreddits = ${JSON.stringify(BLOCKED_SUBREDDITS)};
  var adultKeywords = ${JSON.stringify(ADULT_KEYWORDS)};
  var blockedTwitterPaths = ${JSON.stringify(BLOCKED_TWITTER_PATHS)};
  var twitterSearchKeywords = ${JSON.stringify(TWITTER_SEARCH_KEYWORDS)};

  // ── Reddit ────────────────────────────────────────────────────────────────
  if (lowerHost === "www.reddit.com" || lowerHost === "reddit.com" ||
      lowerHost === "old.reddit.com" || lowerHost === "oauth.reddit.com") {

    // Bloqueia subreddits conhecidos por nome exato
    for (var i = 0; i < blockedSubreddits.length; i++) {
      if (lowerUrl.indexOf("/r/" + blockedSubreddits[i] + "/") !== -1 ||
          lowerUrl.indexOf("/r/" + blockedSubreddits[i] + "?") !== -1 ||
          lowerUrl.endsWith("/r/" + blockedSubreddits[i])) {
        return "PROXY 127.0.0.1:1";
      }
    }

    // Bloqueia subreddits cujo nome contenha palavras adultas
    var match = lowerUrl.match(/\\/r\\/([a-z0-9_]+)/);
    if (match) {
      var name = match[1];
      for (var j = 0; j < adultKeywords.length; j++) {
        if (name.indexOf(adultKeywords[j]) !== -1) {
          return "PROXY 127.0.0.1:1";
        }
      }
    }
  }

  // ── Twitter / X ───────────────────────────────────────────────────────────
  if (lowerHost === "twitter.com" || lowerHost === "www.twitter.com" ||
      lowerHost === "x.com" || lowerHost === "www.x.com") {

    // Paths específicos
    for (var k = 0; k < blockedTwitterPaths.length; k++) {
      if (lowerUrl.indexOf(blockedTwitterPaths[k].toLowerCase()) !== -1) {
        return "PROXY 127.0.0.1:1";
      }
    }

    // Pesquisas com keywords adultas
    for (var l = 0; l < twitterSearchKeywords.length; l++) {
      if (lowerUrl.indexOf("search?q=" + twitterSearchKeywords[l]) !== -1 ||
          lowerUrl.indexOf("search?q=%23" + twitterSearchKeywords[l]) !== -1) {
        return "PROXY 127.0.0.1:1";
      }
    }
  }

  return "DIRECT";
}
`.trim();
}

export function startPacServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) { resolve(); return; }

    const script = buildPacScript();

    server = http.createServer((req, res) => {
      if (req.url === "/proxy.pac" || req.url === "/") {
        res.writeHead(200, {
          "Content-Type": "application/x-ns-proxy-autoconfig",
          "Cache-Control": "no-cache",
        });
        res.end(script);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(PAC_PORT, "127.0.0.1", () => {
      console.log(`✅ PAC server: http://127.0.0.1:${PAC_PORT}/proxy.pac`);
      resolve();
    });

    server.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
        console.warn("PAC server port already in use — assuming already running");
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

export function stopPacServer(): void {
  if (server) {
    server.close();
    server = null;
    console.log("PAC server stopped");
  }
}

export const PAC_URL = `http://127.0.0.1:${PAC_PORT}/proxy.pac`;
