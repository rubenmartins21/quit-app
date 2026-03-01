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

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Extrai path e query de forma robusta, sem depender do host
  // Funciona com http, https, variações www/old/mobile, redirects, etc.
  var pathOnly = lowerUrl.replace(/^https?:\/\/[^/]+/, "");
  var qMark = pathOnly.indexOf("?");
  var path  = qMark !== -1 ? pathOnly.substring(0, qMark) : pathOnly;
  var query = qMark !== -1 ? pathOnly.substring(qMark + 1) : "";

  // Tenta decodificar query string (pode estar URL-encoded)
  var decodedQuery = query;
  try { decodedQuery = decodeURIComponent(query.replace(/\+/g, " ")); } catch(e) {}

  // Hosts alvo — Reddit
  var isReddit = (lowerHost === "reddit.com" ||
                  lowerHost === "www.reddit.com" ||
                  lowerHost === "old.reddit.com" ||
                  lowerHost === "oauth.reddit.com" ||
                  lowerHost === "sh.reddit.com");

  // Hosts alvo — Twitter/X
  var isTwitter = (lowerHost === "twitter.com" ||
                   lowerHost === "www.twitter.com" ||
                   lowerHost === "x.com" ||
                   lowerHost === "www.x.com");

  // ── Reddit ────────────────────────────────────────────────────────────────
  if (isReddit) {

    // A) Subreddit — extrai nome do path de forma robusta
    //    Captura /r/NOME seguido de / ou fim de path
    var subM = path.match(/\/r\/([a-z0-9_]{1,50})(\/|$)/);
    if (subM) {
      var subName = subM[1];

      // A1. Lista exata
      for (var i = 0; i < blockedSubreddits.length; i++) {
        if (subName === blockedSubreddits[i]) return "PROXY 127.0.0.1:1";
      }

      // A2. Nome contém keyword adulta
      //     ex: "pawgbehavior" → contém "pawg"
      //         "bigassporn"   → contém "ass", "porn"
      for (var j = 0; j < adultKeywords.length; j++) {
        if (subName.indexOf(adultKeywords[j]) !== -1) return "PROXY 127.0.0.1:1";
      }
    }

    // B) Slug do post — /comments/ID/SLUG
    //    Normaliza underscores, hífens e caracteres não-alfanuméricos para espaço
    //    ex: "big_asses_get_fucked" → "big asses get fucked"
    var postM = path.match(/\/comments\/[a-z0-9]+\/([^/]+)/);
    if (postM) {
      var slug = postM[1]
        .replace(/[_\-]+/g, " ")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^\s|\s$/g, "");

      for (var p = 0; p < adultKeywords.length; p++) {
        if (slug.indexOf(adultKeywords[p]) !== -1) return "PROXY 127.0.0.1:1";
      }
      for (var ps = 0; ps < pornstarNames.length; ps++) {
        if (slug.indexOf(pornstarNames[ps]) !== -1) return "PROXY 127.0.0.1:1";
      }
      for (var ch = 0; ch < adultChannels.length; ch++) {
        if (slug.indexOf(adultChannels[ch]) !== -1) return "PROXY 127.0.0.1:1";
      }
    }

    // C) Query string de pesquisa — /search?q=porn
    //    Verifica tanto a raw como a decodificada
    if (decodedQuery.length > 0) {
      for (var q = 0; q < adultKeywords.length; q++) {
        if (decodedQuery.indexOf(adultKeywords[q]) !== -1) return "PROXY 127.0.0.1:1";
      }
    }

    // D) Fallback — keyword adulta em qualquer parte da URL do Reddit
    //    Garante bloqueio mesmo que o parsing A/B/C falhe
    //    Aplica-se APENAS a hosts Reddit para evitar falsos positivos globais
    for (var f = 0; f < adultKeywords.length; f++) {
      if (lowerUrl.indexOf(adultKeywords[f]) !== -1) return "PROXY 127.0.0.1:1";
    }
  }

  // ── Twitter / X ───────────────────────────────────────────────────────────
  if (isTwitter) {

    // A) Paths específicos (/i/timeline, etc.)
    for (var k = 0; k < blockedTwitterPaths.length; k++) {
      if (path.indexOf(blockedTwitterPaths[k].toLowerCase()) !== -1) {
        return "PROXY 127.0.0.1:1";
      }
    }

    // B) Parâmetro ?q= — extrai e decodifica valor
    //    Suporta: ?q=porn, ?q=porn+hub, ?q=%23nsfw, ?q=riley%20reid
    var qParam = "";
    var qRaw = "";
    var qIdx = query.indexOf("q=");
    if (qIdx !== -1) {
      qRaw = query.substring(qIdx + 2).split("&")[0];
      try { qParam = decodeURIComponent(qRaw.replace(/\+/g, " ")); } catch(e) { qParam = qRaw; }
    }

    if (qParam.length > 0) {
      // Verifica keywords adultas gerais
      for (var l = 0; l < adultKeywords.length; l++) {
        if (qParam.indexOf(adultKeywords[l]) !== -1) return "PROXY 127.0.0.1:1";
      }
      // Verifica keywords Twitter específicas (nomes de pornstars, canais, etc.)
      for (var ts = 0; ts < twitterSearchKeywords.length; ts++) {
        if (qParam.indexOf(twitterSearchKeywords[ts]) !== -1) return "PROXY 127.0.0.1:1";
      }
    }

    // C) Fallback — keyword adulta na URL completa do Twitter
    for (var tf = 0; tf < adultKeywords.length; tf++) {
      if (lowerUrl.indexOf(adultKeywords[tf]) !== -1) return "PROXY 127.0.0.1:1";
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
