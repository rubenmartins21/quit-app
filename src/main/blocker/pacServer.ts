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

// ── Palavras-chave em nomes de subreddits e títulos de posts ─────────────────
//
// CRITÉRIO DE INCLUSÃO:
// - Palavras explicitamente sexuais em qualquer contexto → incluídas
// - Palavras ambíguas (ex: "facial", "squirt", "milf") → incluídas pois
//   em contexto de subreddit/post title raramente são inocentes
// - Palavras completamente normais fora do contexto adulto (ex: "latina",
//   "college", "teen") → NÃO incluídas para evitar falsos positivos
//   (são cobertas pela lista de subreddits exatos acima)
//
const ADULT_KEYWORDS = [
  // ── Inglês — termos explícitos ───────────────────────────────────────────
  "nsfw", "porn", "xxx", "nude", "naked", "gonewild",
  "hentai", "rule34", "rule63", "erotic", "fetish",
  "onlyfans", "milf", "anal", "boob", "tit", "ass",
  "creampie", "bdsm", "bondage", "cum", "slut", "cock", "blowjob",
  "panties", "lingerie", "pantyhose", "stockings", "fishnet", "latex",
  "cuck", "cuckold", "bbw", "threesome", "gangbang", "groupsex", "orgy",
  "pornstar", "pornhub", "xvideos", "redtube", "fap",
  "nudepic", "nudephoto", "nudity",
  "sexting", "gayporn", "gaynaked", "gaysex", "gayhentai",
  "legalporn", "legalxxx",
  "pawg", "fuck", "fucked", "fucking", "pussy", "dick",
  "orgasm", "squirt", "handjob", "facial", "deepthroat",
  "hotwife", "swinger", "camgirl", "stripper", "thot",
  "onlyfan", "fansly",
  // Inglês — das imagens (tags de sites adultos)
  "cumshot", "cumswallow", "cumswap", "cumonface", "cumonbody",
  "cumontits", "cumonass", "cumonpussy", "cumoncock",
  "blowjob", "ballsucking", "ballgag", "balllicking",
  "buttplug", "buttplugged", "analgape", "analfisting", "analorgasm",
  "analplugged", "analcreampie",
  "bigcock", "bigblackdick", "bigblackcock", "bbc",
  "bigboobs", "bigbreasts", "bigtits", "bigass", "bigbutt", "bigclit",
  "blackpussy", "blacklesbians", "blackbbw",
  "dildo", "dildo riding", "dildoriding",
  "doubleanal", "doublepenetration", "dp",
  "facefuck", "throatfuck", "deepthroatfuck", "throatpie",
  "girlongirl", "lesbiananal", "lesbianorgy", "lesbianstrapon",
  "lesbianfisting", "lesbianseduction",
  "gilf", "cougar", "granny", "blackgranny",
  "gangbang", "foursome", "ffm", "mmf",
  "jerkoff", "handjob", "momhandjob", "povjerkoff",
  "gagging", "gaping", "jigglyass", "jigglytits",
  "horny", "hornygirl",
  "missionary", "cowgirl", "reversecowgirl", "doggystyle",
  "poundingpussy", "pussyfuck", "pussylicking", "pussyrubbing",
  "roughsex", "hardcoresex", "realdsex",
  "ridingcock", "duldoriding", "facesitting",
  "scissoring", "tribbing",
  "squirtinmouth", "squirtface",
  "stepmom", "stepdad", "stepsis", "stepbro", "stepson",
  "sexformoney", "prostitute", "whore", "escort",
  "spank", "spanking", "submissive", "dominatrix", "femdom",
  "rimjob", "rimming", "titjob", "titfuck", "footjob",
  "wetpussy", "wettits", "wetpanties",
  "virginteen", "virgingirl",
  "wifeswap", "wifeanal", "wifeblowjob", "sexwife", "hotwife",
  "youngteen", "youngporn",
  // ── Português — termos explícitos das imagens ────────────────────────────
  "porno", "pornografia", "sexo", "nudez", "pelado", "pelada",
  "erotico", "erotica", "safadeza", "safada", "safado",
  "buceta", "bunda", "pau", "porra", "gozada", "gozar",
  "boquete", "punheta", "foda", "fodeu", "fodendo",
  "masturbacao", "masturbando", "semasturba",
  "peitos", "peituda", "rabuda", "culona",
  "lesbica", "lesbicas",
  "corno", "cornudo", "safado",
  "ejaculacao", "ejaculando",
  "orgasmo", "orgasmos",
  "vaginaaberta", "bucetamolhada", "bucetaapertada",
  "duplapenetracao", "penetracao",
  "gargantaprofunda", "engolindo",
  "sexoanal", "sexooral", "sexoemgrupo", "sexoemPublico",
  "adolescentesexo", "amadorsexo",
  "trepando", "transando", "fazendosex",
  // ── Espanhol (de XGroovy ES) ─────────────────────────────────────────────
  "porno", "pornografia", "sexo", "desnudo", "desnuda",
  "erotico", "erotica", "putas", "puta",
  "coño", "cono", "culo", "verga", "polla", "corrida",
  "mamada", "follando", "follada", "follar", "folla",
  "lesbianas", "lesbiana",
  "sexoanal", "sexooral",
  "chorreando", "coñomojado",
  "sodomia", "sodomie",
  "troia", "zorra",                    // IT+ES slang
  // ── Francês (de XGroovy FR) ──────────────────────────────────────────────
  "pornographie", "sexe", "erotique", "nue",
  "chatte", "cul", "bite", "baiser", "levrette",
  "lesbiennes", "lesbienne",
  "salope", "pute", "baise", "foutre",
  "sodomie", "branlette", "ejaculation",
  "fellation", "cunnilingus",
  "ejacule", "sperme",
  // ── Italiano (de XGroovy IT) ─────────────────────────────────────────────
  "porno", "pornografia", "sesso", "nudo", "nuda",
  "figa", "culo", "cazzo", "scopare", "troia",
  "lesbiche", "lesbica",
  "pompino", "sborrata", "sborra",
  "scopata", "inculata",
  "fottere", "puttana",
  // ── Alemão ───────────────────────────────────────────────────────────────
  "pornografie", "nackt", "erotik",
  "muschi", "arsch", "schwanz", "ficken",
  "lesben", "lesbe", "wichsen", "fotze",
  // ── Russo (transliterado) ─────────────────────────────────────────────────
  "porno", "seks", "golaya", "erotika",
  "pizda", "zhopa", "huy", "ebat",
  // ── Japonês (romaji) ─────────────────────────────────────────────────────
  "ero", "ecchi", "hentai", "etchi",
  "oppai", "manko", "chinpo",
  // ── Coreano (romaji) ─────────────────────────────────────────────────────
  "yadong", "avporno", "hentaisex",
  // ── Chinês (romaji/pinyin) ────────────────────────────────────────────────
  "seqing", "huangse", "chaoji", "luoti",
  // ── Hindi (romaji) ───────────────────────────────────────────────────────
  "ashlil", "sexvideo", "chudai", "gaand", "lund",
];

// ── Nomes de pornstars conhecidas ────────────────────────────────────────────
// Usados para bloquear buscas no Twitter e slugs de posts no Reddit
const PORNSTAR_NAMES = [
  // A
  "abella danger", "abella", "alina lopez", "alina rai", "alina tumanova",
  "angela white", "anissa kate", "anny walker", "ariella ferrera",
  "ava addams",
  // B
  "brandi love",
  // C
  "candy love", "cherie deville",
  // D
  "dana dearmond", "danika mori", "dickforlily",
  // E
  "eliza ibarra", "emily willis", "emma hix", "eva elfie",
  // G
  "gina gerson",
  // J
  "jane wilde",
  // K
  "katty west", "kelly aleman", "kendra lust", "kenzie reeves", "kriss kiss",
  // L
  "lily larimar", "lolly lips", "luna star", "luxury girl",
  // M
  "marica hase", "mia khalifa", "mia malkova",
  // N
  "nancy a",
  // P
  "piper perri",
  // R
  "reagan foxx", "riley reid",
  // S
  "sara jay", "savannah watson", "sheila ortega", "sweetie fox",
  // T
  "tiffany tatum", "tori black", "tory sweety",
  // V
  "valentina nappi",
  // W
  "whitney wright",
  // Y
  "yasmina khan", "your priya", "yourxdarling", "yoursoniya",
];

// ── Canais/studios de conteúdo adulto ────────────────────────────────────────
// Nomes de produtoras/canais — bloqueados em slugs do Reddit e buscas no Twitter
const ADULT_CHANNELS = [
  // Plataformas gerais
  "brazzers", "bangbros", "bang bros", "xgroovy", "pornsok",
  "xvideos", "pornhub", "redtube", "xhamster", "youporn",
  "spankbang", "tnaflix", "porndude", "thepornude",
  // Studios — lista pornsok.com (por ordem de popularidade)
  "blacked", "blacked raw", "teen erotica", "oldje", "defloration tv",
  "pure taboo", "puba", "dogfart", "dogfart network", "naughty america",
  "mom xxx", "pure mature", "teen mega world", "letsdoeit",
  "wow girls", "adult time", "my friends hot mom",
  "private", "public agent", "18 videoz", "vixen",
  "reality kings", "nubile films", "tushy", "dirty flix",
  "girlsway", "jules jordan", "passion hd", "first anal quest",
  "teeny lovers", "bratty sis", "all girl massage", "team skeet",
  "21 naturals", "mofos", "slim 4k", "21 sextreme",
  "ultra films", "evil angel", "hijab hookup", "lusty grandmas",
  "mia khalifa", "pornstar platinum", "x-sensual", "dane jones",
  "step siblings caught", "the white boxxx", "devils film",
  "family strokes", "povd", "digital playground", "girls do porn",
  "casual teen sex", "new sensations", "moms teach sex",
  "sis loves me", "young courtesans", "nubiles porn", "mylf",
  // Slugs/aliases sem espaços (para deteção em URLs)
  "bangbrosnetwork", "dogfartnetwork", "naughtyamerica",
  "realitykings", "nubilefilms", "dirtflix", "girlsway",
  "julesjordan", "firstanalquest", "teenylovers", "brattyis",
  "allgirlmassage", "teamskeet", "21naturals", "21sextreme",
  "ultrafilms", "evilangel", "hijeabhookup", "lustygrandmas",
  "pornstarplatinum", "xsensual", "danejones", "stepsiblingscaught",
  "thewhiteboxxx", "devilsfilm", "familystrokes",
  "digitalplayground", "girlsdoporn", "casualteensex",
  "newsensations", "momsteachsex", "sislovesme",
  "youngcourtesans", "nubilesporn",
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
  "milf", "milfs", "bbw", "pawg",
  "pornstar", "pornstars", "pornstaronlyfans", "pornstarleak",
  "onlyfansleak", "onlyfansleaks",
  "gonewildstories", "gonewildteen", "gonewildcollege",
  "pornhub", "xvideos", "redtube", "pornvideo", "pornvideos",
  "pornclips", "pornhdb", "pornhd",
  "gayporn", "gayhentai", "gayxxx",
  "pornleaks", "pornleak", "pornmemes", "pornart",
  "rule63", "creampie", "bondage", "bdsm", "anal", "blowjob",
  "facesitting", "cum", "slut", "cock",
  // Pornstars (pesquisas por nome no Twitter)
  ...PORNSTAR_NAMES,
  // Studios/canais
  ...ADULT_CHANNELS,
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
  var pornstarNames = ${JSON.stringify(PORNSTAR_NAMES)};
  var adultChannels = ${JSON.stringify(ADULT_CHANNELS)};

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
    var match = lowerUrl.match(/\/r\/([a-z0-9_]+)/);
    if (match) {
      var name = match[1];
      for (var j = 0; j < adultKeywords.length; j++) {
        if (name.indexOf(adultKeywords[j]) !== -1) {
          return "PROXY 127.0.0.1:1";
        }
      }
    }

    // Bloqueia posts cujo título (slug) contenha palavras adultas ou nomes de pornstars
    var postMatch = lowerUrl.match(/\/comments\/[a-z0-9]+\/([^/?]+)/);
    if (postMatch) {
      var postSlug = postMatch[1].replace(/_/g, " ");
      for (var p = 0; p < adultKeywords.length; p++) {
        if (postSlug.indexOf(adultKeywords[p]) !== -1) {
          return "PROXY 127.0.0.1:1";
        }
      }
      // Verifica nomes de pornstars no título do post
      for (var ps = 0; ps < pornstarNames.length; ps++) {
        if (postSlug.indexOf(pornstarNames[ps]) !== -1) {
          return "PROXY 127.0.0.1:1";
        }
      }
      // Verifica nomes de canais/studios no título do post
      for (var ch = 0; ch < adultChannels.length; ch++) {
        if (postSlug.indexOf(adultChannels[ch]) !== -1) {
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

    // Pesquisas com keywords adultas, nomes de pornstars e canais
    for (var l = 0; l < twitterSearchKeywords.length; l++) {
      var kw = twitterSearchKeywords[l].replace(/ /g, "%20");
      if (lowerUrl.indexOf("search?q=" + kw) !== -1 ||
          lowerUrl.indexOf("search?q=" + twitterSearchKeywords[l]) !== -1 ||
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
