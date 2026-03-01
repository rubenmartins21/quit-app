"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
const fs = require("fs");
const crypto = require("crypto");
const child_process = require("child_process");
const os = require("os");
const http = require("http");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const sessionFile = () => path.join(electron.app.getPath("userData"), "session.json");
function saveSession(token) {
  fs.writeFileSync(sessionFile(), JSON.stringify({ token, savedAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2));
}
function loadSession() {
  try {
    if (!fs.existsSync(sessionFile())) return null;
    const data = JSON.parse(fs.readFileSync(sessionFile(), "utf-8"));
    return data.token ?? null;
  } catch {
    return null;
  }
}
function clearSession() {
  if (fs.existsSync(sessionFile())) fs.unlinkSync(sessionFile());
}
const BASE_URL = process.env.VITE_API_URL ?? "http://localhost:4000";
let currentToken = null;
function setToken(token) {
  currentToken = token;
}
async function request(method, endpoint, body, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth && currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : void 0 });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? "Erro desconhecido" };
    return { data: json };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sem ligação ao servidor" };
  }
}
async function requestOtp(email) {
  return request("POST", "/auth/request-otp", { email });
}
async function verifyOtp(email, code, deviceId, platform) {
  return request("POST", "/auth/verify-otp", { email, code, deviceId, platform });
}
async function getMe() {
  return request("GET", "/me", void 0, true);
}
async function createChallenge(durationDays, reason) {
  return request("POST", "/challenges", { durationDays, reason }, true);
}
async function getActiveChallenge() {
  return request("GET", "/challenges/active", void 0, true);
}
async function cancelChallenge(id) {
  return request("PATCH", `/challenges/${id}/cancel`, void 0, true);
}
async function createQuitRequest(id, feeling) {
  return request("POST", `/challenges/${id}/quit-request`, { feeling }, true);
}
async function cancelQuitRequest(id) {
  return request("DELETE", `/challenges/${id}/quit-request`, void 0, true);
}
async function getChallengeHistory() {
  return request("GET", "/challenges", void 0, true);
}
function getOrCreateDeviceId() {
  const filePath = path.join(electron.app.getPath("userData"), "device.json");
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data.deviceId) return data.deviceId;
    }
  } catch {
  }
  const deviceId = crypto.randomUUID();
  fs.writeFileSync(filePath, JSON.stringify({ deviceId, createdAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2));
  return deviceId;
}
function getDevicePlatform() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "mac";
  return "linux";
}
const ADULT_DOMAINS = [
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
  // RedGifs — quase exclusivamente conteúdo adulto
  "redgifs.com",
  "www.redgifs.com",
  "i.redgifs.com",
  "thumbs.redgifs.com",
  "api.redgifs.com",
  "v3.redgifs.com"
  // Nota: Reddit e Twitter CDNs NÃO estão aqui — imagens/vídeos normais devem funcionar
  // O bloqueio de conteúdo adulto no Reddit/Twitter é feito via PAC file por URL path
];
const SAFE_DNS_PRIMARY = "1.1.1.3";
const SAFE_DNS_SECONDARY = "1.0.0.3";
const SAFE_DNS_PRIMARY_V6 = "2606:4700:4700::1113";
const SAFE_DNS_SECONDARY_V6 = "2606:4700:4700::1003";
const HOSTS_MARKER_START = "# QUIT-BLOCKER-START";
const HOSTS_MARKER_END = "# QUIT-BLOCKER-END";
const BLOCKED_URL_PATTERNS = [
  "*://redgifs.com/*",
  "*://*.redgifs.com/*"
];
const PAC_PORT = 7777;
let server = null;
const BLOCKED_SUBREDDITS = [
  // Lista original
  "nsfw",
  "gonewild",
  "porn",
  "sex",
  "hentai",
  "rule34",
  "realgirls",
  "cumsluts",
  "holdthemoan",
  "girlsfinishingthejob",
  "chickflixxx",
  "dirtyr4r",
  "onlyfansreview",
  "sexygirls",
  "amateur",
  "nude",
  "naked",
  "ass",
  "boobs",
  "tits",
  "gonewildstories",
  "watchitfortheplot",
  "sexybutnotporn",
  "realasians",
  "latinas",
  "ebony",
  "petitegonewild",
  "18_19",
  "collegesluts",
  "nsfw_gif",
  "nsfw_videos",
  // Adicionados
  "pornhub",
  "redtube",
  "xvideos",
  "clipcake",
  "pornstar",
  "pornstarvideos",
  "pornstarx",
  "pornstarsluts",
  "pornstarfuck",
  "pornstarlesbians",
  "pornstargirls",
  "pornstarbabes",
  "pornstarmodels",
  "pornstaramatures",
  "pornstarcompilation",
  "pornstarcompilations",
  "pornstaronlyfans",
  "pornstaronly",
  "pornstaronlyfansleak",
  "pornstarleaks",
  "pornstarleak",
  "pornstarleaksex",
  "pornstarleakpics",
  "pornstarhub",
  "pornhdb",
  "pornhdb2",
  "pornhdb3",
  "pornhdgallery",
  "pornhdclips",
  "pornhd",
  "nudeshots",
  "nudeworld",
  "nudelife",
  "nudeteens",
  "teensgonewild",
  "teenporn",
  "teensex",
  "teenhotties",
  "teenbabes",
  "porncomics",
  "pornart",
  "pornartwork",
  "pornillustration",
  "pornartists",
  "pornartlovers",
  "pornhentai",
  "pornhentais",
  "hentaiporn",
  "rule63",
  "rule34hentai",
  "rule34xxx",
  "pornrule34",
  "pornhunks",
  "pornboys",
  "pornmales",
  "pornmen",
  "gayporn",
  "gaynaked",
  "gaysex",
  "gayhentai",
  "gayxxx",
  "pornalt",
  "pornaltart",
  "pornaltartwork",
  "pornalters",
  "pornaltpride",
  "pornoverflow",
  "pornhelp",
  "pornquestions",
  "pornreview",
  "pornreviews",
  "pornrate",
  "pornleaks",
  "pornleak",
  "leakporn",
  "nudelooking",
  "nudeleak",
  "nudeteenleak",
  "pornhumor",
  "pornjokes",
  "pornmemes",
  "pornmeme",
  "pornmemeart",
  "pornmemesdaily",
  "pornwallpaper",
  "pornwallpapers",
  "pornbackground",
  "pornwallpaperhq",
  "pornmuse",
  "pornholic",
  "pornaddict",
  "pornjunkie",
  "pornslut",
  "pornsluts",
  "pornslutsofnet",
  "pornslutsclub",
  "realboobs",
  "realnudes",
  "realnudelooks",
  "realteenporn",
  "gonewildteen",
  "gonewildcollege",
  "gonewildmilf",
  "gonewildbbw",
  "gonewildasian",
  "gonewildlatina",
  "gonewildhentai",
  "gonewildhentais",
  "18plus",
  "legalporn",
  "legalxxx",
  "bondage",
  "bdsmporn",
  "bdsmsex",
  "bdsmnude",
  "milfmemes",
  "milfart",
  "milfxxx",
  "milfporn",
  "milfonlyfans",
  "bbw",
  "threesome",
  "gangbang",
  "groupsex",
  "orgy",
  "pornparty",
  "fap",
  "faptime",
  "fapathon",
  "fapfap"
];
const ADULT_KEYWORDS = [
  // ── Inglês — termos explícitos ───────────────────────────────────────────
  "nsfw",
  "porn",
  "xxx",
  "nude",
  "naked",
  "gonewild",
  "hentai",
  "rule34",
  "rule63",
  "erotic",
  "fetish",
  "onlyfans",
  "milf",
  "anal",
  "boob",
  "tit",
  "ass",
  "creampie",
  "bdsm",
  "bondage",
  "cum",
  "slut",
  "cock",
  "blowjob",
  "panties",
  "lingerie",
  "pantyhose",
  "stockings",
  "fishnet",
  "latex",
  "cuck",
  "cuckold",
  "bbw",
  "threesome",
  "gangbang",
  "groupsex",
  "orgy",
  "pornstar",
  "pornhub",
  "xvideos",
  "redtube",
  "fap",
  "nudepic",
  "nudephoto",
  "nudity",
  "sexting",
  "gayporn",
  "gaynaked",
  "gaysex",
  "gayhentai",
  "legalporn",
  "legalxxx",
  "pawg",
  "fuck",
  "fucked",
  "fucking",
  "pussy",
  "dick",
  "orgasm",
  "squirt",
  "handjob",
  "facial",
  "deepthroat",
  "hotwife",
  "swinger",
  "camgirl",
  "stripper",
  "thot",
  "onlyfan",
  "fansly",
  // Inglês — das imagens (tags de sites adultos)
  "cumshot",
  "cumswallow",
  "cumswap",
  "cumonface",
  "cumonbody",
  "cumontits",
  "cumonass",
  "cumonpussy",
  "cumoncock",
  "blowjob",
  "ballsucking",
  "ballgag",
  "balllicking",
  "buttplug",
  "buttplugged",
  "analgape",
  "analfisting",
  "analorgasm",
  "analplugged",
  "analcreampie",
  "bigcock",
  "bigblackdick",
  "bigblackcock",
  "bbc",
  "bigboobs",
  "bigbreasts",
  "bigtits",
  "bigass",
  "bigbutt",
  "bigclit",
  "blackpussy",
  "blacklesbians",
  "blackbbw",
  "dildo",
  "dildo riding",
  "dildoriding",
  "doubleanal",
  "doublepenetration",
  "dp",
  "facefuck",
  "throatfuck",
  "deepthroatfuck",
  "throatpie",
  "girlongirl",
  "lesbiananal",
  "lesbianorgy",
  "lesbianstrapon",
  "lesbianfisting",
  "lesbianseduction",
  "gilf",
  "cougar",
  "granny",
  "blackgranny",
  "gangbang",
  "foursome",
  "ffm",
  "mmf",
  "jerkoff",
  "handjob",
  "momhandjob",
  "povjerkoff",
  "gagging",
  "gaping",
  "jigglyass",
  "jigglytits",
  "horny",
  "hornygirl",
  "missionary",
  "cowgirl",
  "reversecowgirl",
  "doggystyle",
  "poundingpussy",
  "pussyfuck",
  "pussylicking",
  "pussyrubbing",
  "roughsex",
  "hardcoresex",
  "realdsex",
  "ridingcock",
  "duldoriding",
  "facesitting",
  "scissoring",
  "tribbing",
  "squirtinmouth",
  "squirtface",
  "stepmom",
  "stepdad",
  "stepsis",
  "stepbro",
  "stepson",
  "sexformoney",
  "prostitute",
  "whore",
  "escort",
  "spank",
  "spanking",
  "submissive",
  "dominatrix",
  "femdom",
  "rimjob",
  "rimming",
  "titjob",
  "titfuck",
  "footjob",
  "wetpussy",
  "wettits",
  "wetpanties",
  "virginteen",
  "virgingirl",
  "wifeswap",
  "wifeanal",
  "wifeblowjob",
  "sexwife",
  "hotwife",
  "youngteen",
  "youngporn",
  // ── Português — termos explícitos das imagens ────────────────────────────
  "porno",
  "pornografia",
  "sexo",
  "nudez",
  "pelado",
  "pelada",
  "erotico",
  "erotica",
  "safadeza",
  "safada",
  "safado",
  "buceta",
  "bunda",
  "pau",
  "porra",
  "gozada",
  "gozar",
  "boquete",
  "punheta",
  "foda",
  "fodeu",
  "fodendo",
  "masturbacao",
  "masturbando",
  "semasturba",
  "peitos",
  "peituda",
  "rabuda",
  "culona",
  "lesbica",
  "lesbicas",
  "corno",
  "cornudo",
  "safado",
  "ejaculacao",
  "ejaculando",
  "orgasmo",
  "orgasmos",
  "vaginaaberta",
  "bucetamolhada",
  "bucetaapertada",
  "duplapenetracao",
  "penetracao",
  "gargantaprofunda",
  "engolindo",
  "sexoanal",
  "sexooral",
  "sexoemgrupo",
  "sexoemPublico",
  "adolescentesexo",
  "amadorsexo",
  "trepando",
  "transando",
  "fazendosex",
  // ── Espanhol (de XGroovy ES) ─────────────────────────────────────────────
  "porno",
  "pornografia",
  "sexo",
  "desnudo",
  "desnuda",
  "erotico",
  "erotica",
  "putas",
  "puta",
  "coño",
  "cono",
  "culo",
  "verga",
  "polla",
  "corrida",
  "mamada",
  "follando",
  "follada",
  "follar",
  "folla",
  "lesbianas",
  "lesbiana",
  "sexoanal",
  "sexooral",
  "chorreando",
  "coñomojado",
  "sodomia",
  "sodomie",
  "troia",
  "zorra",
  // IT+ES slang
  // ── Francês (de XGroovy FR) ──────────────────────────────────────────────
  "pornographie",
  "sexe",
  "erotique",
  "nue",
  "chatte",
  "cul",
  "bite",
  "baiser",
  "levrette",
  "lesbiennes",
  "lesbienne",
  "salope",
  "pute",
  "baise",
  "foutre",
  "sodomie",
  "branlette",
  "ejaculation",
  "fellation",
  "cunnilingus",
  "ejacule",
  "sperme",
  // ── Italiano (de XGroovy IT) ─────────────────────────────────────────────
  "porno",
  "pornografia",
  "sesso",
  "nudo",
  "nuda",
  "figa",
  "culo",
  "cazzo",
  "scopare",
  "troia",
  "lesbiche",
  "lesbica",
  "pompino",
  "sborrata",
  "sborra",
  "scopata",
  "inculata",
  "fottere",
  "puttana",
  // ── Alemão ───────────────────────────────────────────────────────────────
  "pornografie",
  "nackt",
  "erotik",
  "muschi",
  "arsch",
  "schwanz",
  "ficken",
  "lesben",
  "lesbe",
  "wichsen",
  "fotze",
  // ── Russo (transliterado) ─────────────────────────────────────────────────
  "porno",
  "seks",
  "golaya",
  "erotika",
  "pizda",
  "zhopa",
  "huy",
  "ebat",
  // ── Japonês (romaji) ─────────────────────────────────────────────────────
  "ero",
  "ecchi",
  "hentai",
  "etchi",
  "oppai",
  "manko",
  "chinpo",
  // ── Coreano (romaji) ─────────────────────────────────────────────────────
  "yadong",
  "avporno",
  "hentaisex",
  // ── Chinês (romaji/pinyin) ────────────────────────────────────────────────
  "seqing",
  "huangse",
  "chaoji",
  "luoti",
  // ── Hindi (romaji) ───────────────────────────────────────────────────────
  "ashlil",
  "sexvideo",
  "chudai",
  "gaand",
  "lund"
];
const PORNSTAR_NAMES = [
  // A
  "abella danger",
  "abella",
  "alina lopez",
  "alina rai",
  "alina tumanova",
  "angela white",
  "anissa kate",
  "anny walker",
  "ariella ferrera",
  "ava addams",
  // B
  "brandi love",
  // C
  "candy love",
  "cherie deville",
  // D
  "dana dearmond",
  "danika mori",
  "dickforlily",
  // E
  "eliza ibarra",
  "emily willis",
  "emma hix",
  "eva elfie",
  // G
  "gina gerson",
  // J
  "jane wilde",
  // K
  "katty west",
  "kelly aleman",
  "kendra lust",
  "kenzie reeves",
  "kriss kiss",
  // L
  "lily larimar",
  "lolly lips",
  "luna star",
  "luxury girl",
  // M
  "marica hase",
  "mia khalifa",
  "mia malkova",
  // N
  "nancy a",
  // P
  "piper perri",
  // R
  "reagan foxx",
  "riley reid",
  // S
  "sara jay",
  "savannah watson",
  "sheila ortega",
  "sweetie fox",
  // T
  "tiffany tatum",
  "tori black",
  "tory sweety",
  // V
  "valentina nappi",
  // W
  "whitney wright",
  // Y
  "yasmina khan",
  "your priya",
  "yourxdarling",
  "yoursoniya"
];
const ADULT_CHANNELS = [
  // Plataformas gerais
  "brazzers",
  "bangbros",
  "bang bros",
  "xgroovy",
  "pornsok",
  "xvideos",
  "pornhub",
  "redtube",
  "xhamster",
  "youporn",
  "spankbang",
  "tnaflix",
  "porndude",
  "thepornude",
  // Studios — lista pornsok.com (por ordem de popularidade)
  "blacked",
  "blacked raw",
  "teen erotica",
  "oldje",
  "defloration tv",
  "pure taboo",
  "puba",
  "dogfart",
  "dogfart network",
  "naughty america",
  "mom xxx",
  "pure mature",
  "teen mega world",
  "letsdoeit",
  "wow girls",
  "adult time",
  "my friends hot mom",
  "private",
  "public agent",
  "18 videoz",
  "vixen",
  "reality kings",
  "nubile films",
  "tushy",
  "dirty flix",
  "girlsway",
  "jules jordan",
  "passion hd",
  "first anal quest",
  "teeny lovers",
  "bratty sis",
  "all girl massage",
  "team skeet",
  "21 naturals",
  "mofos",
  "slim 4k",
  "21 sextreme",
  "ultra films",
  "evil angel",
  "hijab hookup",
  "lusty grandmas",
  "mia khalifa",
  "pornstar platinum",
  "x-sensual",
  "dane jones",
  "step siblings caught",
  "the white boxxx",
  "devils film",
  "family strokes",
  "povd",
  "digital playground",
  "girls do porn",
  "casual teen sex",
  "new sensations",
  "moms teach sex",
  "sis loves me",
  "young courtesans",
  "nubiles porn",
  "mylf",
  // Slugs/aliases sem espaços (para deteção em URLs)
  "bangbrosnetwork",
  "dogfartnetwork",
  "naughtyamerica",
  "realitykings",
  "nubilefilms",
  "dirtflix",
  "girlsway",
  "julesjordan",
  "firstanalquest",
  "teenylovers",
  "brattyis",
  "allgirlmassage",
  "teamskeet",
  "21naturals",
  "21sextreme",
  "ultrafilms",
  "evilangel",
  "hijeabhookup",
  "lustygrandmas",
  "pornstarplatinum",
  "xsensual",
  "danejones",
  "stepsiblingscaught",
  "thewhiteboxxx",
  "devilsfilm",
  "familystrokes",
  "digitalplayground",
  "girlsdoporn",
  "casualteensex",
  "newsensations",
  "momsteachsex",
  "sislovesme",
  "youngcourtesans",
  "nubilesporn"
];
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
  "/search?q=boobs",
  "/search?q=tits",
  "/search?q=ass",
  "/search?q=boob",
  "/search?q=cum",
  "/search?q=slut",
  "/search?q=hentai",
  "/search?q=rule34",
  "/search?q=gonewild",
  "/search?q=onlyfans",
  "/search?q=nudes",
  "/search?q=nudepic",
  "/search?q=nudephotos",
  "/search?q=nudity",
  "/search?q=xxx",
  "/search?q=pornstar",
  "/search?q=sexting",
  "/search?q=bdsm",
  "/search?q=creampie",
  "/search?q=panties",
  "/search?q=lingerie",
  "/search?q=stockings",
  "/search?q=bondage",
  "/search?q=anal",
  "/search?q=blowjob",
  "/search?q=cock",
  "/search?q=facesitting"
];
const TWITTER_SEARCH_KEYWORDS = [
  // Lista original
  "nsfw",
  "porn",
  "nude",
  "naked",
  "sex",
  "xxx",
  "onlyfans",
  "hentai",
  "rule34",
  "gonewild",
  // Adicionadas
  "nudes",
  "nudepic",
  "nudephotos",
  "nudity",
  "boob",
  "boobs",
  "tits",
  "tit",
  "ass",
  "booty",
  "panties",
  "lingerie",
  "sexting",
  "milf",
  "milfs",
  "bbw",
  "pawg",
  "pornstar",
  "pornstars",
  "pornstaronlyfans",
  "pornstarleak",
  "onlyfansleak",
  "onlyfansleaks",
  "gonewildstories",
  "gonewildteen",
  "gonewildcollege",
  "pornhub",
  "xvideos",
  "redtube",
  "pornvideo",
  "pornvideos",
  "pornclips",
  "pornhdb",
  "pornhd",
  "gayporn",
  "gayhentai",
  "gayxxx",
  "pornleaks",
  "pornleak",
  "pornmemes",
  "pornart",
  "rule63",
  "creampie",
  "bondage",
  "bdsm",
  "anal",
  "blowjob",
  "facesitting",
  "cum",
  "slut",
  "cock",
  // Pornstars (pesquisas por nome no Twitter)
  ...PORNSTAR_NAMES,
  // Studios/canais
  ...ADULT_CHANNELS
];
function buildPacScript() {
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
  var pathOnly = lowerUrl.replace(/^https?://[^/]+/, "");
  var qMark = pathOnly.indexOf("?");
  var path  = qMark !== -1 ? pathOnly.substring(0, qMark) : pathOnly;
  var query = qMark !== -1 ? pathOnly.substring(qMark + 1) : "";

  // Tenta decodificar query string (pode estar URL-encoded)
  var decodedQuery = query;
  try { decodedQuery = decodeURIComponent(query.replace(/+/g, " ")); } catch(e) {}

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
    var subM = path.match(//r/([a-z0-9_]{1,50})(/|$)/);
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
    var postM = path.match(//comments/[a-z0-9]+/([^/]+)/);
    if (postM) {
      var slug = postM[1]
        .replace(/[_-]+/g, " ")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/s+/g, " ")
        .replace(/^s|s$/g, "");

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
      try { qParam = decodeURIComponent(qRaw.replace(/+/g, " ")); } catch(e) { qParam = qRaw; }
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
function startPacServer() {
  return new Promise((resolve, reject) => {
    if (server) {
      resolve();
      return;
    }
    const script = buildPacScript();
    server = http.createServer((req, res) => {
      if (req.url === "/proxy.pac" || req.url === "/") {
        res.writeHead(200, {
          "Content-Type": "application/x-ns-proxy-autoconfig",
          "Cache-Control": "no-cache"
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
      if (err.code === "EADDRINUSE") {
        console.warn("PAC server port already in use — assuming already running");
        resolve();
      } else {
        reject(err);
      }
    });
  });
}
function stopPacServer() {
  if (server) {
    server.close();
    server = null;
    console.log("PAC server stopped");
  }
}
const PAC_URL = `http://127.0.0.1:${PAC_PORT}/proxy.pac`;
function getScriptPath() {
  return path.join(electron.app.getPath("userData"), "quit-blocker-helper.ps1");
}
function getResultPath() {
  return path.join(os.tmpdir(), "quit-blocker-result.json");
}
function buildScript(opts = {}) {
  const hostsPath = "C:\\Windows\\System32\\drivers\\etc\\hosts";
  const allDomains = [...ADULT_DOMAINS, ...opts.extraDomains ?? []];
  const domainLines = allDomains.map((d) => `0.0.0.0 ${d}`).join("\r\n");
  const pacUrl = PAC_URL;
  const appPathsJson = JSON.stringify(opts.blockedApps ?? []);
  return `param([string]$Action, [string]$ResultPath)

$result = @{ ok = $true; hostsActive = $false; dnsActive = $false; pacActive = $false; error = "" }
$hostsPath = "${hostsPath.replace(/\\/g, "\\\\")}"
$markerStart = "${HOSTS_MARKER_START}"
$markerEnd = "${HOSTS_MARKER_END}"
$primaryDNS = "${SAFE_DNS_PRIMARY}"
$secondaryDNS = "${SAFE_DNS_SECONDARY}"
$primaryDNSv6 = "${SAFE_DNS_PRIMARY_V6}"
$secondaryDNSv6 = "${SAFE_DNS_SECONDARY_V6}"
$pacUrl = "${pacUrl}"
$regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
$ifeoBase = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options"
$blockedApps = '${appPathsJson}' | ConvertFrom-Json
$fakeDebugger = "C:\\Windows\\System32\\ping.exe 0.0.0.0 -n 1"

function Flush-DNS { try { ipconfig /flushdns | Out-Null } catch {} }

function Block-Apps {
  foreach ($exePath in $blockedApps) {
    $exeName = [System.IO.Path]::GetFileName($exePath)
    try {
      $key = "$ifeoBase\\$exeName"
      if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
      Set-ItemProperty -Path $key -Name "Debugger" -Value $fakeDebugger -Force
      $procName = [System.IO.Path]::GetFileNameWithoutExtension($exeName)
      Get-Process -Name $procName -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue
    } catch {}
  }
}

function Unblock-Apps {
  foreach ($exePath in $blockedApps) {
    $exeName = [System.IO.Path]::GetFileName($exePath)
    try {
      $key = "$ifeoBase\\$exeName"
      if (Test-Path $key) {
        Remove-ItemProperty -Path $key -Name "Debugger" -ErrorAction SilentlyContinue
        $props = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
        $userProps = $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' }
        if (-not $userProps -or $userProps.Count -eq 0) {
          Remove-Item -Path $key -Force -ErrorAction SilentlyContinue
        }
      }
    } catch {}
  }
  Get-ChildItem $ifeoBase -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $debugger = (Get-ItemProperty $_.PSPath -Name "Debugger" -ErrorAction SilentlyContinue).Debugger
      if ($debugger -like "*ping.exe 0.0.0.0*") {
        Remove-ItemProperty -Path $_.PSPath -Name "Debugger" -ErrorAction SilentlyContinue
      }
    } catch {}
  }
}

function Notify-ProxyChange {
  try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinInetHelper {
  [DllImport("wininet.dll", SetLastError=true)]
  public static extern bool InternetSetOption(IntPtr h, int opt, IntPtr buf, int len);
}
"@ -ErrorAction SilentlyContinue
    [WinInetHelper]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
    [WinInetHelper]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
  } catch {}
}

function Get-ActiveAdapters {
  try { return (Get-NetAdapter | Where-Object { $_.Status -eq "Up" }).Name }
  catch { return @("Wi-Fi", "Ethernet") }
}

function Remove-QuitEntries([string]$content) {
  $startIdx = $content.IndexOf($markerStart)
  $endIdx = $content.IndexOf($markerEnd)
  if ($startIdx -ge 0 -and $endIdx -ge 0) {
    $content = $content.Substring(0, $startIdx) + $content.Substring($endIdx + $markerEnd.Length)
  }
  return $content.TrimEnd() + "\`r\`n"
}

function Activate-Block {
  # 1. Hosts file
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $content = Remove-QuitEntries $content
  $block = "\`r\`n" + $markerStart + "\`r\`n${domainLines}\`r\`n" + $markerEnd + "\`r\`n"
  $content = $content.TrimEnd() + $block
  [System.IO.File]::WriteAllText($hostsPath, $content, [System.Text.Encoding]::ASCII)

  # 2. DNS IPv4
  $adapters = Get-ActiveAdapters
  foreach ($a in $adapters) {
    try { netsh interface ip set dns "$a" static $primaryDNS primary validate=no | Out-Null } catch {}
    try { netsh interface ip add dns "$a" $secondaryDNS index=2 validate=no | Out-Null } catch {}
  }

  # 3. DNS IPv6
  foreach ($a in $adapters) {
    try { netsh interface ipv6 set dns "$a" static $primaryDNSv6 primary validate=no | Out-Null } catch {}
    try { netsh interface ipv6 add dns "$a" $secondaryDNSv6 index=2 validate=no | Out-Null } catch {}
  }

  # 4. PAC file
  Set-ItemProperty -Path $regPath -Name "AutoConfigURL" -Value $pacUrl
  Set-ItemProperty -Path $regPath -Name "ProxyEnable" -Value 0
  Notify-ProxyChange

  # 5. Bloqueia apps via IFEO
  Block-Apps

  Flush-DNS
}

function Deactivate-Block {
  # 1. Hosts file
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $content = Remove-QuitEntries $content
  [System.IO.File]::WriteAllText($hostsPath, $content, [System.Text.Encoding]::ASCII)

  # 2. DNS IPv4 -> DHCP
  $adapters = Get-ActiveAdapters
  foreach ($a in $adapters) {
    try { netsh interface ip set dns "$a" dhcp | Out-Null } catch {}
  }

  # 3. DNS IPv6 -> DHCP
  foreach ($a in $adapters) {
    try { netsh interface ipv6 set dns "$a" dhcp | Out-Null } catch {}
  }

  # 4. Remove PAC
  try { Remove-ItemProperty -Path $regPath -Name "AutoConfigURL" -ErrorAction SilentlyContinue } catch {}
  Set-ItemProperty -Path $regPath -Name "ProxyEnable" -Value 0
  Notify-ProxyChange

  # 5. Desbloqueia apps
  Unblock-Apps

  Flush-DNS
}

function Get-Status {
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $result["hostsActive"] = $content.Contains($markerStart)

  $dnsOut = netsh interface ip show dns 2>$null | Out-String
  $result["dnsActive"] = $dnsOut.Contains($primaryDNS)

  try {
    $pacVal = Get-ItemProperty -Path $regPath -Name "AutoConfigURL" -ErrorAction SilentlyContinue
    $result["pacActive"] = ($null -ne $pacVal -and $pacVal.AutoConfigURL -eq $pacUrl)
  } catch {
    $result["pacActive"] = $false
  }
}

try {
  switch ($Action) {
    "activate"   { Activate-Block }
    "deactivate" { Deactivate-Block }
    "status"     { Get-Status }
    default { $result["ok"] = $false; $result["error"] = "Unknown action: $Action" }
  }
} catch {
  $result["ok"] = $false
  $result["error"] = $_.Exception.Message
}

$result | ConvertTo-Json | Set-Content -Path $ResultPath -Encoding UTF8
`;
}
async function runElevated(action, opts = {}) {
  const resultPath = getResultPath();
  try {
    if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath);
  } catch {
  }
  try {
    fs.writeFileSync(getScriptPath(), buildScript(opts), "utf-8");
  } catch (err) {
    return { ok: false, error: `Failed to write helper script: ${err}` };
  }
  const scriptPath = getScriptPath();
  return new Promise((resolve) => {
    const ps = child_process.spawn("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""${scriptPath}"" -Action ${action} -ResultPath ""${resultPath}""'`
    ]);
    ps.on("close", (code) => {
      try {
        if (!fs.existsSync(resultPath)) {
          resolve({
            ok: false,
            error: code !== 0 ? "Operação cancelada pelo utilizador." : "Script falhou silenciosamente."
          });
          return;
        }
        resolve(JSON.parse(fs.readFileSync(resultPath, "utf-8")));
      } catch (err) {
        resolve({ ok: false, error: `Failed to read result: ${err}` });
      }
    });
    ps.on("error", (err) => resolve({ ok: false, error: err.message }));
  });
}
let interceptorActive = false;
function activateRequestInterceptor() {
  if (interceptorActive) return;
  const ses = electron.session.defaultSession;
  ses.webRequest.onBeforeRequest(
    { urls: BLOCKED_URL_PATTERNS },
    (details, callback) => {
      console.log(`🚫 Blocked request: ${details.url}`);
      callback({ cancel: true });
    }
  );
  interceptorActive = true;
  console.log("✅ Request interceptor active");
}
function deactivateRequestInterceptor() {
  if (!interceptorActive) return;
  electron.session.defaultSession.webRequest.onBeforeRequest(null);
  interceptorActive = false;
  console.log("✅ Request interceptor deactivated");
}
const REDDIT_DOMAINS = [
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "new.reddit.com",
  "oauth.reddit.com",
  "sh.reddit.com",
  "gateway.reddit.com",
  "v.redd.it",
  "i.redd.it",
  "preview.redd.it",
  "external-preview.redd.it"
];
const TWITTER_DOMAINS = [
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "t.co",
  "abs.twimg.com",
  "pbs.twimg.com",
  "video.twimg.com",
  "api.twitter.com",
  "api.x.com",
  "upload.twitter.com"
];
function getFilePath() {
  return path.join(electron.app.getPath("userData"), "custom-blocklist.json");
}
function loadCustomBlocklist() {
  try {
    const raw = fs.readFileSync(getFilePath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveCustomBlocklist(bl) {
  fs.writeFileSync(getFilePath(), JSON.stringify(bl, null, 2), "utf-8");
}
function clearCustomBlocklist() {
  try {
    fs.unlinkSync(getFilePath());
  } catch {
  }
}
function getCustomDomains(bl) {
  const domains = [];
  if (bl.blockReddit) domains.push(...REDDIT_DOMAINS);
  if (bl.blockTwitter) domains.push(...TWITTER_DOMAINS);
  for (const url2 of bl.blockedUrls) {
    const d = normalizeDomain(url2);
    if (d && !domains.includes(d)) domains.push(d, `www.${d}`);
  }
  return domains;
}
function getInstalledApps() {
  const tmpScript = path.join(os.tmpdir(), "quit-list-apps.ps1");
  const tmpResult = path.join(os.tmpdir(), "quit-list-apps.json");
  const script = `
$apps = @()
$paths = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)
foreach ($p in $paths) {
  Get-ItemProperty $p -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -and ($_.DisplayIcon -or $_.InstallLocation) } |
    ForEach-Object {
      $name = $_.DisplayName.Trim()

      # Tenta DisplayIcon primeiro (remove parâmetros de ícone como ",0")
      $icon = ($_.DisplayIcon -replace '"','').Trim()
      $icon = ($icon -split ',')[0].Trim()

      # Se não for .exe, tenta InstallLocation + nome do exe
      $exe = ""
      if ($icon -match '\\.exe$' -and (Test-Path $icon)) {
        $exe = $icon
      } elseif ($_.InstallLocation -and (Test-Path $_.InstallLocation)) {
        $found = Get-ChildItem $_.InstallLocation -Filter "*.exe" -ErrorAction SilentlyContinue |
          Where-Object { $_.Name -notmatch '(uninstall|setup|update|redist|vcredist|repair)' } |
          Select-Object -First 1
        if ($found) { $exe = $found.FullName }
      }

      if ($exe -ne "" -and $name -ne "") {
        $apps += [PSCustomObject]@{ name = $name; exePath = $exe }
      }
    }
}
$apps | Sort-Object name -Unique | ConvertTo-Json -Compress | Set-Content -Path '${tmpResult.replace(/\\/g, "\\\\")}' -Encoding UTF8
`.trim();
  try {
    fs.writeFileSync(tmpScript, script, "utf-8");
    child_process.execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpScript}"`,
      { encoding: "utf-8", timeout: 15e3, stdio: ["pipe", "pipe", "ignore"] }
    );
    if (!fs.existsSync(tmpResult)) return [];
    const raw = fs.readFileSync(tmpResult, "utf-8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.filter((a) => a.name && a.exePath).map((a) => ({ name: String(a.name).trim(), exePath: String(a.exePath).trim() })).slice(0, 300);
  } catch (err) {
    console.error("[customBlocklist] getInstalledApps failed:", err);
    return [];
  } finally {
    try {
      fs.unlinkSync(tmpScript);
    } catch {
    }
    try {
      fs.unlinkSync(tmpResult);
    } catch {
    }
  }
}
function normalizeDomain(input) {
  try {
    let s = input.trim().toLowerCase();
    if (!s.startsWith("http")) s = "https://" + s;
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, "");
    if (!host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}
function getStatePath() {
  return path.join(electron.app.getPath("userData"), "blocker-state.json");
}
function loadBlockerState() {
  try {
    return JSON.parse(fs.readFileSync(getStatePath(), "utf-8"));
  } catch {
    return { active: false, activatedAt: null, challengeId: null };
  }
}
function saveBlockerState(state) {
  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), "utf-8");
}
function buildElevatedOpts(bl) {
  return {
    extraDomains: getCustomDomains(bl),
    blockedApps: bl.blockedApps.map((a) => a.exePath)
  };
}
async function activateBlocker(challengeId, customBl) {
  console.log("🔒 Activating blocker for challenge:", challengeId);
  if (customBl) {
    saveCustomBlocklist({ ...customBl, addedAt: (/* @__PURE__ */ new Date()).toISOString() });
  }
  const bl = customBl ?? loadCustomBlocklist() ?? {
    blockReddit: false,
    blockTwitter: false,
    blockedApps: [],
    blockedUrls: [],
    addedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await startPacServer();
  activateRequestInterceptor();
  const result = await runElevated("activate", buildElevatedOpts(bl));
  saveBlockerState({ active: true, activatedAt: (/* @__PURE__ */ new Date()).toISOString(), challengeId });
  if (result.ok) {
    console.log("✅ Blocker fully activated");
  } else {
    console.warn("⚠️  System-level failed:", result.error);
  }
  return { ok: true };
}
async function deactivateBlocker() {
  console.log("🔓 Deactivating blocker...");
  deactivateRequestInterceptor();
  const bl = loadCustomBlocklist();
  const opts = bl ? buildElevatedOpts(bl) : {};
  const result = await runElevated("deactivate", opts);
  stopPacServer();
  clearCustomBlocklist();
  saveBlockerState({ active: false, activatedAt: null, challengeId: null });
  if (result.ok) {
    console.log("✅ Blocker fully deactivated");
  } else {
    console.warn("⚠️  System-level deactivation failed:", result.error);
  }
  return result;
}
async function addToActiveBlocker(payload) {
  const state = loadBlockerState();
  if (!state.active) return { ok: false, error: "Nenhum bloqueador activo." };
  let bl = loadCustomBlocklist() ?? {
    blockReddit: false,
    blockTwitter: false,
    blockedApps: [],
    blockedUrls: [],
    addedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (payload.url) {
    const domain = normalizeDomain(payload.url);
    if (!domain) return { ok: false, error: "URL inválido." };
    if (bl.blockedUrls.includes(domain)) return { ok: false, error: "Já está na lista." };
    bl = { ...bl, blockedUrls: [...bl.blockedUrls, domain] };
  }
  if (payload.app) {
    if (bl.blockedApps.some((a) => a.exePath === payload.app.exePath)) {
      return { ok: false, error: "App já está na lista." };
    }
    bl = { ...bl, blockedApps: [...bl.blockedApps, payload.app] };
  }
  if (payload.blockReddit !== void 0) bl = { ...bl, blockReddit: payload.blockReddit };
  if (payload.blockTwitter !== void 0) bl = { ...bl, blockTwitter: payload.blockTwitter };
  saveCustomBlocklist(bl);
  const result = await runElevated("activate", buildElevatedOpts(bl));
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
async function loadAndRestoreInterceptor() {
  const state = loadBlockerState();
  if (!state.active) return;
  await startPacServer();
  activateRequestInterceptor();
  console.log("🔒 PAC server + interceptor restored from previous session");
}
async function getBlockerStatus() {
  const state = loadBlockerState();
  if (!state.active) {
    return { active: false, hostsActive: false, dnsActive: false, pacActive: false };
  }
  const result = await runElevated("status");
  return {
    active: state.active,
    hostsActive: result.hostsActive ?? false,
    dnsActive: result.dnsActive ?? false,
    pacActive: result.pacActive ?? false
  };
}
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
const ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
const getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
const ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
const errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
let overrideErrorMap = errorMap;
function getErrorMap() {
  return overrideErrorMap;
}
const makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
const INVALID = Object.freeze({
  status: "aborted"
});
const DIRTY = (value) => ({ status: "dirty", value });
const OK = (value) => ({ status: "valid", value });
const isAborted = (x) => x.status === "aborted";
const isDirty = (x) => x.status === "dirty";
const isValid = (x) => x.status === "valid";
const isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message == null ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
class ParseInputLazyPath {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
const handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: (params == null ? void 0 : params.async) ?? false,
        contextualErrorMap: params == null ? void 0 : params.errorMap
      },
      path: (params == null ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err == null ? void 0 : err.message) == null ? void 0 : _a.toLowerCase()) == null ? void 0 : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params == null ? void 0 : params.errorMap,
        async: true
      },
      path: (params == null ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const cuidRegex = /^c[^\s-]{8,}$/i;
const cuid2Regex = /^[0-9a-z]+$/;
const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;
const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
const durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
let emojiRegex;
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
const ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
const base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
const dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
const dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && (decoded == null ? void 0 : decoded.typ) !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
class ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options == null ? void 0 : options.precision) === "undefined" ? null : options == null ? void 0 : options.precision,
      offset: (options == null ? void 0 : options.offset) ?? false,
      local: (options == null ? void 0 : options.local) ?? false,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options == null ? void 0 : options.precision) === "undefined" ? null : options == null ? void 0 : options.precision,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options == null ? void 0 : options.position,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (params == null ? void 0 : params.coerce) ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
class ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
}
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params == null ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
class ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (params == null ? void 0 : params.coerce) ?? false,
    ...processCreateParams(params)
  });
};
class ZodBoolean extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params == null ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
class ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
}
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params == null ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
class ZodSymbol extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
class ZodUndefined extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
class ZodNull extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
class ZodAny extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
class ZodNever extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
}
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
class ZodVoid extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
class ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
class ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b;
          const defaultError = ((_b = (_a = this._def).errorMap) == null ? void 0 : _b.call(_a, issue, ctx).message) ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
}
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
class ZodUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
class ZodIntersection extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
}
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
class ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple({
      ...this._def,
      rest
    });
  }
}
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
}
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
class ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
class ZodLiteral extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
class ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
}
ZodEnum.create = createZodEnum;
class ZodNativeEnum extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
}
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
}
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
class ZodEffects extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
}
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
class ZodOptional extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
class ZodNullable extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
class ZodDefault extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
class ZodCatch extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
class ZodNaN extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
}
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
class ZodBranded extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}
class ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}
class ZodReadonly extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
const stringType = ZodString.create;
const numberType = ZodNumber.create;
const booleanType = ZodBoolean.create;
ZodNever.create;
const arrayType = ZodArray.create;
const objectType = ZodObject.create;
ZodUnion.create;
ZodIntersection.create;
ZodTuple.create;
ZodEnum.create;
ZodPromise.create;
ZodOptional.create;
ZodNullable.create;
electron.ipcMain.handle("auth:request-otp", async (_e, email) => {
  const parsed = stringType().email().safeParse(email);
  if (!parsed.success) return { error: "Email invalido" };
  const res = await requestOtp(parsed.data);
  return res.error ? { error: res.error } : { ok: true };
});
electron.ipcMain.handle("auth:verify-otp", async (_e, payload) => {
  const parsed = objectType({ email: stringType().email(), code: stringType().length(6) }).safeParse(payload);
  if (!parsed.success) return { error: "Dados invalidos" };
  const res = await verifyOtp(parsed.data.email, parsed.data.code, getOrCreateDeviceId(), getDevicePlatform());
  if (res.error || !res.data) return { error: res.error ?? "Erro" };
  saveSession(res.data.token);
  setToken(res.data.token);
  return { ok: true, user: res.data.user };
});
electron.ipcMain.handle("auth:me", async () => {
  const res = await getMe();
  if (res.error || !res.data) return { error: res.error ?? "Sessao invalida" };
  return { ok: true, user: res.data };
});
electron.ipcMain.handle("auth:logout", async () => {
  clearSession();
  setToken(null);
  return { ok: true };
});
const BlockedAppSchema = objectType({
  name: stringType(),
  exePath: stringType()
});
const CreateSchema = objectType({
  durationDays: numberType().int().min(7),
  reason: stringType().min(10).max(500).trim(),
  // Preferências de bloqueio custom (opcionais)
  blockReddit: booleanType().optional().default(false),
  blockTwitter: booleanType().optional().default(false),
  blockedApps: arrayType(BlockedAppSchema).optional().default([]),
  blockedUrls: arrayType(stringType().max(200)).optional().default([])
});
const QuitRequestSchema = objectType({
  id: stringType(),
  feeling: stringType().min(5).max(1e3).trim()
});
async function syncBlockerWithChallengeState(challenge) {
  const blockerState = loadBlockerState();
  if (!blockerState.active) return;
  if (challenge === null) {
    console.log("🔓 No active challenge detected — deactivating blocker automatically");
    await deactivateBlocker();
    return;
  }
  if (challenge.status !== "active") {
    console.log(`🔓 Challenge status is '${challenge.status}' — deactivating blocker`);
    await deactivateBlocker();
  }
}
electron.ipcMain.handle("challenge:create", async (_e, payload) => {
  var _a;
  const parsed = CreateSchema.safeParse(payload);
  if (!parsed.success) return { error: ((_a = parsed.error.errors[0]) == null ? void 0 : _a.message) ?? "Dados inválidos" };
  const res = await createChallenge(parsed.data.durationDays, parsed.data.reason);
  if (res.error || !res.data) return { error: res.error ?? "Erro ao criar desafio" };
  const customBl = {
    blockReddit: parsed.data.blockReddit ?? false,
    blockTwitter: parsed.data.blockTwitter ?? false,
    blockedApps: parsed.data.blockedApps ?? [],
    blockedUrls: parsed.data.blockedUrls ?? [],
    addedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  console.log("🔒 Challenge created, activating blocker...");
  const blockerResult = await activateBlocker(res.data.id, customBl);
  if (!blockerResult.ok) console.warn("⚠️  Blocker activation failed:", blockerResult.error);
  return { ok: true, challenge: res.data, blockerActive: blockerResult.ok };
});
electron.ipcMain.handle("challenge:active", async () => {
  var _a;
  const res = await getActiveChallenge();
  if (res.error) return { error: res.error };
  const challenge = ((_a = res.data) == null ? void 0 : _a.challenge) ?? null;
  await syncBlockerWithChallengeState(challenge);
  return { ok: true, challenge };
});
electron.ipcMain.handle("challenge:cancel", async (_e, id) => {
  if (typeof id !== "string") return { error: "ID inválido" };
  const res = await cancelChallenge(id);
  if (res.error || !res.data) return { error: res.error ?? "Erro ao cancelar" };
  console.log("🔓 Challenge cancelled, deactivating blocker...");
  await deactivateBlocker();
  return { ok: true, challenge: res.data };
});
electron.ipcMain.handle("challenge:quit-request:create", async (_e, payload) => {
  var _a;
  const parsed = QuitRequestSchema.safeParse(payload);
  if (!parsed.success) return { error: ((_a = parsed.error.errors[0]) == null ? void 0 : _a.message) ?? "Dados inválidos" };
  const res = await createQuitRequest(parsed.data.id, parsed.data.feeling);
  return res.error ? { error: res.error } : { ok: true, challenge: res.data };
});
electron.ipcMain.handle("challenge:quit-request:cancel", async (_e, id) => {
  if (typeof id !== "string") return { error: "ID inválido" };
  const res = await cancelQuitRequest(id);
  return res.error ? { error: res.error } : { ok: true, challenge: res.data };
});
electron.ipcMain.handle("challenge:history", async () => {
  var _a;
  const res = await getChallengeHistory();
  return res.error ? { error: res.error } : { ok: true, challenges: ((_a = res.data) == null ? void 0 : _a.challenges) ?? [] };
});
electron.ipcMain.handle("blocker:status", async () => {
  const state = loadBlockerState();
  const custom = loadCustomBlocklist();
  return {
    ok: true,
    active: state.active,
    challengeId: state.challengeId,
    blockReddit: (custom == null ? void 0 : custom.blockReddit) ?? false,
    blockTwitter: (custom == null ? void 0 : custom.blockTwitter) ?? false,
    blockedApps: (custom == null ? void 0 : custom.blockedApps) ?? [],
    blockedUrls: (custom == null ? void 0 : custom.blockedUrls) ?? []
  };
});
electron.ipcMain.handle("blocker:activate", async (_e, challengeId) => {
  if (typeof challengeId !== "string") return { error: "challengeId inválido" };
  const result = await activateBlocker(challengeId);
  return result.ok ? { ok: true } : { error: result.error ?? "Falha ao ativar bloqueio" };
});
electron.ipcMain.handle("blocker:deactivate", async () => {
  const result = await deactivateBlocker();
  return result.ok ? { ok: true } : { error: result.error ?? "Falha ao desativar bloqueio" };
});
electron.ipcMain.handle("blocker:full-status", async () => {
  const status = await getBlockerStatus();
  return { ok: true, ...status };
});
electron.ipcMain.handle("blocker:installed-apps", async () => {
  const apps = getInstalledApps();
  return { ok: true, apps };
});
electron.ipcMain.handle("blocker:add", async (_e, payload) => {
  const schema = objectType({
    url: stringType().min(3).max(200).optional(),
    app: objectType({ name: stringType(), exePath: stringType() }).optional(),
    blockReddit: booleanType().optional(),
    blockTwitter: booleanType().optional()
  });
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "Payload inválido" };
  const result = await addToActiveBlocker(parsed.data);
  return result.ok ? { ok: true } : { error: result.error };
});
const logFile = path.join(electron.app.getPath("userData"), "blocker-debug.log");
const logStream = fs.createWriteStream(logFile, { flags: "a" });
const origLog = console.log.bind(console);
console.log = (...args) => {
  origLog(...args);
  logStream.write(args.join(" ") + "\n");
};
const __dirname$1 = path.dirname(url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("index.js", document.baseURI).href));
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const BLOCKER_SYNC_INTERVAL_MS = 5 * 60 * 1e3;
async function syncBlockerInBackground() {
  var _a;
  const state = loadBlockerState();
  if (!state.active) return;
  const session = loadSession();
  if (!session) {
    console.log("⏰ Sync: no session — keeping blocker active");
    return;
  }
  try {
    const res = await getActiveChallenge();
    if (res.error) {
      console.warn("⏰ Sync: backend unreachable, keeping blocker active");
      return;
    }
    const challenge = ((_a = res.data) == null ? void 0 : _a.challenge) ?? null;
    if (challenge === null || challenge.status !== "active") {
      console.log("⏰ Sync: no active challenge — deactivating blocker");
      await deactivateBlocker();
    }
  } catch (err) {
    console.warn("⏰ Sync failed:", err);
  }
}
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 720,
    minHeight: 500,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#f9f9f8",
    webPreferences: {
      preload: path.join(__dirname$1, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    },
    show: false
  });
  win.setMenuBarVisibility(false);
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url: url2 }) => {
    electron.shell.openExternal(url2);
    return { action: "deny" };
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname$1, "../../dist/index.html"));
  }
}
electron.app.on("ready", async () => {
  getOrCreateDeviceId();
  const token = loadSession();
  if (token) {
    setToken(token);
    console.log("✅ Session restored");
  }
  await loadAndRestoreInterceptor();
  await syncBlockerInBackground();
  setInterval(syncBlockerInBackground, BLOCKER_SYNC_INTERVAL_MS);
  createWindow();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
//# sourceMappingURL=index.js.map
