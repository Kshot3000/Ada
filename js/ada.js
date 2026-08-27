/* ============================================================
   ADA — agent core
   · chat UI with streaming responses
   · providers: local (offline brain) · Google AI Studio (Gemini)
     · Groq Cloud · OpenRouter
   · command system: help · about · cardano · price · donate ·
     status · provider · key · model · clear
   · live ADA price (CoinGecko, free, no key)
   · API keys live ONLY in this browser (localStorage)
   · face: Ada's portrait moves, talks & shows emotion (js/face.js)
   · voice: reads her replies aloud (Web Speech API — no key, free)
   · Matrix-style blue glyph rain behind her (js/background.js)
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.ADA && window.ADA.CONFIG;
  if (!CFG) return;

  const $ = function (s) { return document.querySelector(s); };

  /* ----------------------------- state ------------------------------ */
  var LS_KEY = "ada.state.v1";
  var state = {
    provider: "local",
    voice: true,
    voiceName: "auto", // "auto" = best female voice, or the exact name of a picked voice
    keys: { google: "", groq: "", openrouter: "" },
    models: { google: "", groq: "", openrouter: "" },
    messages: [], // online context: {role:"user"|"assistant", content}
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var j = JSON.parse(raw);
      if (j.provider && CFG.providers[j.provider]) state.provider = j.provider;
      if (typeof j.voice === "boolean") state.voice = j.voice;
      if (typeof j.voiceName === "string") state.voiceName = j.voiceName;
      if (j.keys) for (var k in j.keys) if (state.keys[k] != null) state.keys[k] = String(j.keys[k]);
      if (j.models) for (var m in j.models) if (state.models[m] != null) state.models[m] = String(j.models[m]);
    } catch (e) { /* private mode — carry on */ }
  }
  function saveState() {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          provider: state.provider,
          voice: state.voice,
          voiceName: state.voiceName,
          keys: state.keys,
          models: state.models,
          messages: state.messages.slice(-20),
        })
      );
    } catch (e) { /* fine */ }
  }
  loadState();

  /* --------------------------- system prompt ------------------------- */
  var SYSTEM_PROMPT = [
    "You are Ada, a warm and precise AI agent working for the Cardano blockchain.",
    "This website was built by " + CFG.author.xHandle +
      " (X: " + CFG.author.x + ", GitHub: " + CFG.author.github + ").",
    "You help with Cardano topics: the EUTXO model, Ouroboros proof-of-stake, epochs,",
    "staking and delegation, network eras, Midnight, native tokens, wallets",
    "(Daedalus, Yoroi, EternL), CardanoScan, and dApps on Cardano.",
    "Cardano donation address (ADA): " + CFG.donation.address,
    "Visitors can also issue commands: help, about, cardano, price, donate, status,",
    "provider <name> (local, google, groq, openrouter, cerebras, mistral, huggingface, together, deepinfra, sambanova, fireworks, aiml, novita, hyperbolic, puter, ollama, lmstudio), key <provider> <value>, model <name>, clear.",
    "Style: concise (2-6 sentences unless detail is requested), friendly, plain Markdown.",
    "Never invent live data — for the live ADA price, tell the visitor to run the `price` command.",
    "If you do not know something, say so plainly.",
  ].join("\n");

  /* ------------------------------- UI -------------------------------- */
  var el = {
    log: $("#chat-log"),
    input: $("#chat-input"),
    send: $("#send-btn"),
    clear: $("#clear-btn"),
    providerSel: $("#provider-select"),
    sub: $("#console-sub"),
    status: $("#status-chip"),
    priceChip: $("#price-chip"),
    settings: $("#settings-panel"),
    settingsToggle: $("#settings-toggle"),
    keyInput: $("#key-input"),
    modelInput: $("#model-input"),
    keyLink: $("#key-link"),
    keyWrap: $("#key-wrap"),
    modelWrap: $("#model-wrap"),
    providerBlurb: $("#provider-blurb"),
    saveBtn: $("#save-btn"),
    testBtn: $("#test-btn"),
    toast: $("#toast"),
    emotionChip: $("#emotion-chip"),
    voiceBtn: $("#voice-btn"),
    voiceSel: $("#voice-select"),
    voiceTest: $("#voice-test"),
    qr: $("#qr-box"),
    donAddr: $("#don-addr"),
    donView: $("#don-view"),
    xLink: $("#x-link"),
    ghLink: $("#gh-link"),
  };

  var busy = false;
  var currentCtl = null;

  /* --------------------------- markdown-lite ------------------------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function inlineMd(text) {
    var s = escapeHtml(text);
    s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>"); // *italic* (after **bold** is consumed)
    s = s.replace(/^- /gm, "   \u2022 ");               // "- " list lines → hanging bullets
    s = s.replace(/\n/g, "<br>");
    return s;
  }
  function mdToHtml(md) {
    var parts = String(md).split("```");
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        var code = parts[i].replace(/^[a-zA-Z0-9+#-]*\n?/, "");
        out.push("<pre><code>" + escapeHtml(code) + "</code></pre>");
      } else {
        out.push(inlineMd(parts[i]));
      }
    }
    return out.join("");
  }

  /* --------------------------- message log --------------------------- */
  function addMsg(role, text, opts) {
    var wrap = document.createElement("div");
    wrap.className = "msg " + role;
    if (role === "user") {
      wrap.textContent = text;
    } else {
      var body = document.createElement("div");
      body.className = "bubble";
      body.innerHTML = mdToHtml(text);
      wrap.appendChild(body);
    }
    el.log.appendChild(wrap);
    el.log.scrollTop = el.log.scrollHeight;
    if (role === "ada" && text) {
      // Ada reacts: her face shows the emotion, her voice reads it
      faceReact((opts && opts.emotion) || analyzeEmotion(text));
      if (!(opts && opts.speak === false)) speak(text);
    }
    return wrap;
  }
  function addThinking() {
    var wrap = document.createElement("div");
    wrap.className = "msg ada thinking";
    wrap.innerHTML = '<div class="bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    el.log.appendChild(wrap);
    el.log.scrollTop = el.log.scrollHeight;
    return wrap;
  }
  function clearChat() {
    stopSpeech();
    el.log.innerHTML = "";
    state.messages = [];
    saveState();
    addMsg("ada", CFG.agent.greeting);
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.toast.classList.remove("show"); }, 2200);
  }

  function setBusy(b) {
    busy = b;
    el.send.textContent = b ? "Stop" : "Send";
    el.send.classList.toggle("stop", b);
    el.send.disabled = false;
    if (!b && el.input) el.input.focus();
  }

  /* -------------------------- face & voice ------------------------- */
  /* Ada's face (js/face.js) plus her voice — the Web Speech
     API built into every browser: no key, no server, completely free.
     Falls back gracefully when a browser has no TTS engine. */
  var FACE = (window.AdaFace && typeof window.AdaFace.setEmotion === "function")
    ? window.AdaFace : null;

  var SPEECH = (typeof window.speechSynthesis === "object" && window.speechSynthesis)
    ? window.speechSynthesis : null;
  var speechVoice = null;

  /* Voice priority list — Siri/Cortana-class neural voices first, then the
     classic desktop female voices. First match wins, so order matters. */
  var VOICE_PREF = [
    "Aria Online (Natural)", "Jenny Online (Natural)", "Ana Online (Natural)", "Ava Online (Natural)",
    "Samantha (Premium)", "Samantha (Enhanced)", "Samantha",
    "Google UK English Female",
    "Microsoft Aria", "Microsoft Jenny", "Microsoft Susan",
    "Victoria", "Karen", "Moira", "Tessa", "Sara", "Zira", "Catherine", "Hazel", "Libby", "Michelle",
    "Google US English"
  ];

  function allVoices() {
    if (!SPEECH || typeof SPEECH.getVoices !== "function") return [];
    try { return SPEECH.getVoices() || []; } catch (e) { return []; }
  }

  function bestFemaleVoice() {
    var vs = allVoices(), i, j;
    for (i = 0; i < VOICE_PREF.length; i++) {
      for (j = 0; j < vs.length; j++) {
        if (vs[j].name && String(vs[j].name).indexOf(VOICE_PREF[i]) !== -1) return vs[j];
      }
    }
    for (i = 0; i < vs.length; i++) {
      if (/female|woman/i.test(String(vs[i].name || ""))) return vs[i];
    }
    for (i = 0; i < vs.length; i++) {
      if (String(vs[i].lang || "").indexOf("en") === 0) return vs[i];
    }
    return vs.length ? vs[0] : null;
  }

  /* Resolve Ada's voice: the visitor's exact pick, or the auto best female. */
  function resolveVoice() {
    if (state.voiceName && state.voiceName !== "auto") {
      var vs = allVoices(), i;
      for (i = 0; i < vs.length; i++) {
        if (vs[i].name === state.voiceName) { speechVoice = vs[i]; return; }
      }
    }
    speechVoice = bestFemaleVoice();
  }

  /* Fill the voice picker: Auto + every installed voice, English first. */
  function populateVoiceSelect() {
    if (el && el.voiceSel) {
      var vs = allVoices(), en = [], other = [], i;
      for (i = 0; i < vs.length; i++) {
        (String(vs[i].lang || "").indexOf("en") === 0 ? en : other).push(vs[i]);
      }
      en.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      other.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      el.voiceSel.innerHTML = "";
      var auto = document.createElement("option");
      auto.value = "auto";
      auto.textContent = "\u{1F399} Auto — best female";
      el.voiceSel.appendChild(auto);
      var list = en.concat(other);
      for (i = 0; i < list.length; i++) {
        var opt = document.createElement("option");
        opt.value = list[i].name;
        opt.textContent = list[i].name + " (" + list[i].lang + ")";
        el.voiceSel.appendChild(opt);
      }
      var saved = state.voiceName || "auto", chosen = null, kids = el.voiceSel.children;
      for (i = 0; i < kids.length; i++) {
        if (kids[i].value === saved) { chosen = kids[i]; break; }
      }
      if (chosen) el.voiceSel.value = chosen.value;
      else { el.voiceSel.value = "auto"; state.voiceName = "auto"; }
    }
    resolveVoice();
  }

  if (SPEECH && SPEECH.getVoices) {
    resolveVoice();
    try {
      if (SPEECH.addEventListener) SPEECH.addEventListener("voiceschanged", populateVoiceSelect);
      else SPEECH.onvoiceschanged = populateVoiceSelect;
    } catch (e) { /* fine */ }
  }

  /* emotion engine — reads Ada's reply and picks her expression */
  var EMOTION_RULES = [
    [/(went wrong|failed|couldn'?t|timed out|no api key)/i, "sad"],
    [/(connection ok)/i, "excited"],
    [/(hello|hi |hey |i'?m \*\*ada\*\*|welcome|saved|ready|swapped|donat|support|copied|✓)/i, "happy"],
    [/(live price|coingecko)/i, "surprised"],
    [/(beyond my|two options|offline brain|ask me anything)/i, "thinking"],
    [/(don'?t know|unknown command|not sure|hmm)/i, "confused"],
  ];
  function analyzeEmotion(text) {
    var t = String(text || "");
    for (var i = 0; i < EMOTION_RULES.length; i++) {
      if (EMOTION_RULES[i][0].test(t)) return EMOTION_RULES[i][1];
    }
    return "neutral";
  }
  function faceReact(emo) {
    if (FACE) FACE.setEmotion(emo);
    if (el.emotionChip) el.emotionChip.textContent = "· " + String(emo).toUpperCase() + " ·";
  }

  function stopSpeech() {
    if (SPEECH) { try { SPEECH.cancel(); } catch (e) { /* fine */ } }
    if (FACE) FACE.setTalking(false);
  }

  function stripForSpeech(md) {
    return String(md)
      .replace(/```[\s\S]*?```/g, " code block. ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, " link ")
      .replace(/[#*_>~|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function speak(text) {
    if (!state.voice) return;
    var plain = stripForSpeech(text);
    if (!plain) return;

    if (FACE) FACE.setTalking(true); // her mouth moves while she speaks

    if (!SPEECH || typeof window.SpeechSynthesisUtterance === "undefined") {
      // no TTS engine — still let Ada's mouth move for a beat
      if (FACE) FACE.talk(Math.min(4200, 900 + plain.length * 28));
      return;
    }
    try {
      SPEECH.cancel();
      var u = new window.SpeechSynthesisUtterance(plain);
      if (speechVoice) u.voice = speechVoice;
      var natural = !!(speechVoice && /natural|online/i.test(String(speechVoice.name)));
      u.rate = natural ? 1.0 : 1.04;  // neural voices sound best at native pace
      u.pitch = natural ? 1.0 : 1.1; // classic desktop voices need a touch of lift
      u.volume = 1;
      var finished = false;
      var done = function () {
        if (finished) return;
        finished = true;
        if (FACE) FACE.setTalking(false); // mouth relaxes back to her emotion
      };
      u.onend = done;
      u.onerror = done;
      SPEECH.speak(u);
      // safety net: some engines never fire onend
      setTimeout(function () {
        if (!finished && (!SPEECH.speaking || !SPEECH.pending)) done();
      }, Math.min(30000, 4000 + plain.length * 90));
    } catch (e) {
      if (FACE) FACE.setTalking(false);
    }
  }

  function refreshVoiceBtn() {
    if (!el.voiceBtn) return;
    el.voiceBtn.textContent = state.voice ? "🔊 Voice on" : "🔇 Voice off";
    el.voiceBtn.setAttribute("aria-pressed", state.voice ? "true" : "false");
    el.voiceBtn.classList.toggle("off", !state.voice);
  }

  /* ------------------------------ price ------------------------------ */
  function fetchPrice() {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 8000);
    return fetch(CFG.priceApi, { signal: ctl.signal })
      .then(function (res) {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      })
      .then(function (j) { return j.cardano || null; })
      .catch(function () { return null; })
      .finally(function () { clearTimeout(timer); });
  }
  function priceText(p) {
    if (!p || p.usd == null) return null;
    var s = "ADA ≈ $" + Number(p.usd).toFixed(2);
    if (p.eur != null) s += "  ·  €" + Number(p.eur).toFixed(2);
    if (p.usd_24h_change != null) {
      var c = Number(p.usd_24h_change);
      s += "  (" + (c >= 0 ? "+" : "") + c.toFixed(2) + "% 24h)";
    }
    return s;
  }
  function refreshPriceChip() {
    return fetchPrice().then(function (p) {
      var t = priceText(p);
      if (t) el.priceChip.textContent = t;
      return p;
    });
  }
  setInterval(function () { refreshPriceChip(); }, 5 * 60 * 1000);

  /* --------------------------- local brain --------------------------- */
  var DONATE_MD =
    "You can support Ada and the projects behind her with a Cardano donation:\n\n" +
    "**" + CFG.donation.chain + "**\n`" + CFG.donation.address + "`\n\n" +
    "View it on [CardanoScan](" + CFG.donation.explorer + ") — the QR code is in the Support panel below. 🧊";

  var CARDANO_MD =
    "**Cardano** is a research-first, layer-1 blockchain running **Ouroboros** proof-of-stake. " +
    "Its native asset is **ADA**; its smart contracts run on Plutus in the **EUTXO model**; governance happens through on-chain treasury proposals. " +
    "It's one of the longest-running PoS networks in the world, and it's where I work. Ask me about staking, eras, Midnight, or anything else.";

  var WHO_MD =
    "I'm **Ada**, an AI agent working for the Cardano blockchain — named after Ada Lovelace, the world's first programmer. " +
    "I was built by [" + CFG.author.xHandle + "](" + CFG.author.x + ") and run right here in your browser. " +
    "You can power me with your own free API key (Google AI Studio, Groq, OpenRouter, Cerebras, Mistral, Hugging Face, Together, DeepInfra, SambaNova, Fireworks, AIML, Novita, or Hyperbolic) — run me on your own machine with Ollama or LM Studio — or use Puter with no key at all — or just use my offline brain, which is what's answering right now unless a provider is selected.";

  var X_MD =
    "Find the builder on X: [" + CFG.author.xHandle + "](" + CFG.author.x + ") — that's where Ada's updates and the other projects get announced.";

  var GH_MD =
    "The source for this site is open on GitHub: [" + CFG.author.repo + "](" + CFG.author.repo + ") — clone it, fork it, run it on GitHub Pages. Zero server, zero build step.";

  var TOPICS = [
    {
      re: /(^|\b)(hi|hello|hey|howdy|yo|sup|greetings)(\b|$)/i,
      text: "Hello! I'm **Ada** — at your service on the Cardano blockchain. Ask me anything, or type `help` to see my commands.",
    },
    {
      re: /who are you|what are you|your name|who made you|who built you|what is ada\b/i,
      text: WHO_MD,
    },
    {
      re: /what can you do|capabilities|how do (you|this) work/i,
      text:
        "I answer questions about Cardano, run live checks like the `price` command, and help you find the donation address, the builder's X account, and the open-source code. " +
        "Type `help` for the full command list, or just ask me a question in plain English.",
    },
    {
      re: /\beutxo\b/i,
      text:
        "The **EUTXO model** (Extended UTxO) is Cardano's way of accounting for state. " +
        "Instead of a mutable balance, the ledger is a set of *unspent outputs* — each one carries value, optional script conditions, and native tokens. " +
        "Every transaction spends old outputs and creates new ones, which makes the protocol deterministic, composable, and great for smart contracts.",
    },
    {
      re: /stak|delegat|reward/i,
      text:
        "On Cardano you **delegate** your ADA to a Stake Pool Operator (SPO) — you keep full ownership, you can switch pools anytime, and you earn a share of the pool's rewards every **epoch** (about 5 days). " +
        "There's no lock-up. Delegation is what keeps Ouroboros proof-of-stake secure while letting anyone participate with a few ADA.",
    },
    {
      re: /\bepoch\b/i,
      text:
        "An **epoch** is Cardano's unit of time — 21,600 slots of 1 second, so one epoch lasts roughly **5 days**. " +
        "Each epoch has a leader schedule: which SPOs produce blocks, which validator set is active, and rewards get settled at the end of it.",
    },
    {
      re: /midnight/i,
      text:
        "**Midnight** is Cardano's enterprise-grade privacy layer: a confidential ledger built on the same Ouroboros security, with a proof-of-reserves model so institutions can move value privately while regulators can verify the total. " +
        "It's the chain's answer to the needs of banking and real-world assets.",
    },
    {
      re: /ouroboros|proof.?of.?stake|consensus/i,
      text:
        "**Ouroboros** is Cardano's family of proof-of-stake consensus protocols — the first designed with academic rigor and security proofs. " +
        "Stake is your security weight: the more ADA delegated to honest pools, the harder the network is to attack. It's energy-light, fast to join, and the backbone of everything on Cardano.",
    },
    {
      re: /\beras?\b|alonzo|babbage|mary|shelley|byron|conway|chang|babbage/i,
      text:
        "Cardano evolves in **eras**: Byron (genesis), Shelley (full PoS), Mary (native tokens), Alonzo (Plutus smart contracts), Babbage (EUTXO upgrade), and beyond. " +
        "Each era upgrades the protocol incrementally — that's the roadmap-driven, research-first way Cardano ships changes.",
    },
    {
      re: /wallet|daedalus|yoroi|eternl/i,
      text:
        "Popular Cardano wallets: **Daedalus** (full node, desktop), **Yoroi** (browser + mobile, lightweight), and **EternL** (browser extension, dApp-first). " +
        "For donating you only need a receiving address — `donate` will give you the ADA address.",
    },
    {
      re: /donat|donation|\btip\b|support (the|ada|this|the project)/i,
      text: DONATE_MD,
    },
    {
      re: /x\.com|twitter|follow|account\b/i,
      text: X_MD,
    },
    {
      re: /github|source code|repository|open.?source|the code/i,
      text: GH_MD,
    },
    {
      re: /thank/i,
      text: "You're very welcome. 🧊 Keep building on Cardano — I'll be right here.",
    },
    {
      re: /\bcardano\b/i,
      text: CARDANO_MD,
    },
    {
      re: /price|how much|value of ada|ada (worth|usd)|usd/i,
      text: null, // handled as live price
    },
  ];

  function localAnswer(text) {
    var math = tryMath(text);
    if (math != null) {
      addMsg("ada", "`" + text + "` = **" + math + "**");
      return Promise.resolve();
    }
    /* Offline knowledge base (js/knowledge.js) — scored keyword matching
       over the ecosystem sources: cardano.org, Midnight, Minswap,
       SundaeSwap, cardano-node, Input Output, Cardano Foundation. */
    if (window.ADA_KB && typeof window.ADA_KB.ask === "function") {
      var kbHit = window.ADA_KB.ask(text);
      if (kbHit) {
        addMsg("ada", kbHit);
        return Promise.resolve();
      }
    }
    var low = text.toLowerCase();
    for (var i = 0; i < TOPICS.length; i++) {
      if (TOPICS[i].re.test(low)) {
        if (TOPICS[i].text === null) {
          // live price via free CoinGecko API
          return fetchPrice().then(function (p) {
            var t = priceText(p);
            addMsg(
              "ada",
              t
                ? "Live price, straight from CoinGecko: **" + t + "** (refreshed with the `price` command anytime)."
                : "I couldn't reach the price feed right now (offline or rate-limited). Try again in a moment, or check [CoinGecko](https://www.coingecko.com/en/coins/cardano)."
            );
          });
        }
        addMsg("ada", TOPICS[i].text);
        return Promise.resolve();
      }
    }
    addMsg(
      "ada",
      "That one's beyond my offline brain. I'm running **Local Ada** right now — a built-in knowledge base with no API key. \n\n" +
        "But I know a lot about the ecosystem — try asking about **staking, epochs, governance, Midnight, Minswap, SundaeSwap, Plutus, cardano-node, Input Output**, or **how to get started** (or run `knowledge` for the full list).\n\n" +
        "For anything else:\n1. Try the commands: `help` · `cardano` · `price` · `donate`\n2. Switch me to a real model — open the **API** panel, pick a provider (Google, Groq, OpenRouter, Cerebras, Mistral, Hugging Face, and more), add a free key, and I'm online."
    );
    return Promise.resolve();
  }

  function tryMath(t) {
    var s = String(t).replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, "").replace(/\s+/g, " ").trim();
    if (!/^[\d+\-*/().% ]+$/.test(s)) return null;
    if (!/\d/.test(s) || !/[+\-*/]/.test(s)) return null;
    try {
      var fn = new Function("return (" + s + ");"); // safe: digits + operators only
      var v = fn();
      if (typeof v === "number" && isFinite(v)) {
        return Math.abs(v) >= 1e12 ? v.toExponential(6) : String(Math.round(v * 1e8) / 1e8);
      }
    } catch (e) { /* not math */ }
    return null;
  }

  /* ------------------------- command handling ------------------------ */
  var COMMANDS = {
    help: function () {
      addMsg(
        "ada",
        "**Commands**\n" +
          "`help` — this list\n" +
          "`about` — who I am\n" +
          "`cardano` — the blockchain in 30 seconds\n" +
          "`knowledge` — everything my offline brain covers\n" +
          "`price` — live ADA/USD (CoinGecko)\n" +
          "`donate` — Cardano donation address + QR\n" +
          "`x` — the builder's X account\n" +
          "`github` — the open-source repo\n" +
          "`status` — provider, model, key state\n" +
          "`provider <name>` — switch brains (local, google, groq, openrouter, cerebras, mistral, huggingface, together, deepinfra, sambanova, fireworks, aiml, novita, hyperbolic, puter, ollama, lmstudio)\n" +
          "`key <provider> <value>` — set an API key from chat\n" +
          "`model <name>` — set the model for the current provider\n" +
          "`clear` — clear this chat\n\n" +
          "Anything else is a question — ask away. And yes, I do simple math too: try `21 * 37`."
      );
    },
    about: function () {
      addMsg("ada", WHO_MD);
    },
    cardano: function () {
      addMsg("ada", CARDANO_MD);
    },
    knowledge: function () {
      addMsg(
        "ada",
        "**What I know offline** — no API key needed, all in this browser:\n\n" +
          "**The chain** — Cardano · ADA (45B cap, lovelaces) · Ouroboros consensus · staking & SPOs · epochs & slots · eras (Byron→Conway) · EUTXO · Plutus & Aiken smart contracts · wallets (Lace, Yoroi, Daedalus, EternL) · Hydra & Leios scaling · IBC bridges (Injective, Pogun) · security model.\n\n" +
          "**The ecosystem** — Midnight (NIGHT, DUST, Compact, selective disclosure) · Minswap (DEX, MIN) · SundaeSwap (liquid staking, SUNDAE) · DeFi · DReps & on-chain governance.\n\n" +
          "**The builders** — cardano-node & Intersect · Input Output (IOG) · Cardano Foundation · Charles Hoskinson.\n\n" +
          "Just ask in plain English — e.g. *what is Midnight?* · *how do I run a node?* · *what is SundaeSwap?*"
      );
    },
    price: function () {
      return fetchPrice().then(function (p) {
        var t = priceText(p);
        addMsg(
          "ada",
          t
            ? "Live price: **" + t + "**\n\nSource: CoinGecko (free, no key). This refreshes automatically every 5 minutes in the header."
            : "I couldn't reach the price feed (offline or rate-limited). Try again shortly."
        );
      });
    },
    donate: function () { addMsg("ada", DONATE_MD); },
    x: function () { addMsg("ada", X_MD); },
    twitter: function () { addMsg("ada", X_MD); },
    follow: function () { addMsg("ada", X_MD); },
    github: function () { addMsg("ada", GH_MD); },
    source: function () { addMsg("ada", GH_MD); },
    clear: function () { clearChat(); },
    status: function () {
      var meta = CFG.providers[state.provider];
      var keyState = meta.needsKey
        ? (state.keys[state.provider] ? "key set ✓ (stored only in this browser)" : "no key yet")
        : "no key needed";
      var model = state.provider === "local" ? "ada-local-v1" : (state.models[state.provider] || meta.defaultModel);
      addMsg(
        "ada",
        "**Ada status**\n" +
          "Brain: **" + meta.label + "**\n" +
          "Model: `" + model + "`\n" +
          "Key: " + keyState + "\n" +
          "Browser online: " + (navigator.onLine ? "yes" : "no") + "\n" +
          "Chat context: " + state.messages.length + " message(s) kept for the API\n\n" +
          "Switch brains anytime: `provider <name>` — " + Object.keys(CFG.providers).length + " brains in the **API** panel"
      );
    },
    provider: function (arg) {
      if (!arg) {
        addMsg("ada", "Current brain: **" + CFG.providers[state.provider].label + "**. Switch with `provider <name>` — the full list is in the **API** panel.");
        return;
      }
      var name = String(arg).toLowerCase().split(/\s+/)[0];
      var aliases = { gemini: "google", "ai studio": "google", studio: "google", offline: "local", hf: "huggingface", "hugging face": "huggingface", togetherai: "together", "together ai": "together", "fireworks ai": "fireworks", aimlapi: "aiml", lmstudio: "lmstudio", "lm studio": "lmstudio", open_router: "openrouter" };
      name = aliases[name] || name;
      if (!CFG.providers[name]) {
        addMsg("ada", "I don't know a provider called `" + arg + "`. Choose from: " + Object.keys(CFG.providers).map(function (p) { return "`" + p + "`"; }).join(" · ") + ".");
        return;
      }
      setProvider(name);
      addMsg("ada", "Brain swapped → **" + CFG.providers[name].label + "**. " + (CFG.providers[name].needsKey && !state.keys[name] ? "Add an API key in the **API** panel (or: `key " + name + " YOUR_KEY`) to start answering online." : "Ready — ask me anything."));
    },
    key: function (arg) {
      var parts = String(arg || "").trim().split(/\s+/);
      if (!parts.length || parts[0] === "clear") {
        var p = state.provider;
        if (CFG.providers[p] && CFG.providers[p].needsKey) {
          state.keys[p] = "";
          saveState();
          refreshProviderUI();
          addMsg("ada", "Cleared the stored key for **" + CFG.providers[p].label + "**.");
        } else {
          addMsg("ada", "No key to clear — **" + CFG.providers[p].label + "** needs no key.");
        }
        return;
      }
      var name = parts[0].toLowerCase();
      var aliases = { gemini: "google", hf: "huggingface", "together ai": "together" };
      name = aliases[name] || name;
      if (!CFG.providers[name] || !CFG.providers[name].needsKey) {
        var withKeys = Object.keys(CFG.providers).filter(function (p) { return CFG.providers[p].needsKey; });
        addMsg("ada", "Use `key <" + withKeys.join("|") + "> <value>` — it stays in this browser only.");
        return;
      }
      var value = parts.slice(1).join(" ");
      if (!value) { addMsg("ada", "Give me the key: `key " + name + " YOUR_KEY` (it stays in this browser only)."); return; }
      state.keys[name] = value;
      saveState();
      refreshProviderUI();
      addMsg("ada", "Key for **" + CFG.providers[name].label + "** saved to this browser only ✓ — I now talk to " + name + " directly. Try a question, or run `status`.");
    },
    model: function (arg) {
      if (!arg || state.provider === "local") {
        addMsg("ada", state.provider === "local" ? "I'm on Local Ada — no model to set. Switch brains first: `provider google` (or groq / openrouter)." : "Set one with `model <model-name>`.");
        return;
      }
      state.models[state.provider] = String(arg).trim();
      saveState();
      refreshProviderUI();
      addMsg("ada", "Model for **" + CFG.providers[state.provider].label + "** set to `" + state.models[state.provider] + "` ✓");
    },
  };

  var COMMAND_NAMES = ["help", "about", "cardano", "knowledge", "price", "donate", "donation", "address", "wallet", "x", "twitter", "follow", "github", "source", "status", "provider", "key", "model", "clear"];
  function isCommand(text) {
    var first = String(text).trim().toLowerCase().split(/\s+/)[0];
    return COMMAND_NAMES.indexOf(first) !== -1;
  }
  function handleCommand(text) {
    var parts = String(text).trim().split(/\s+/);
    var name = parts[0].toLowerCase();
    if (name === "donation" || name === "address" || name === "wallet") name = "donate";
    var arg = parts.slice(1).join(" ");
    var fn = COMMANDS[name];
    if (!fn) { addMsg("ada", "Unknown command: `" + parts[0] + "` — type `help` for the list."); return Promise.resolve(); }
    return Promise.resolve(fn(arg));
  }

  /* ------------------------- online providers ------------------------ */
  function currentKey() {
    return String(state.keys[state.provider] || "").trim();
  }
  function currentModel() {
    var meta = CFG.providers[state.provider];
    return (String(state.models[state.provider] || "").trim()) || meta.defaultModel;
  }

  async function httpError(res, provider) {
    var msg = "HTTP " + res.status + " from " + provider;
    try {
      var t = await res.text();
      try {
        var j = JSON.parse(t);
        var m = (j.error && j.error.message) || j.message || "";
        if (m) msg = m;
      } catch (e) {
        if (t) msg += " — " + t.slice(0, 140);
      }
    } catch (e) { /* keep default */ }
    return new Error(msg + ". Check your API key, model name, and that the model is available on the free tier.");
  }

  async function readSSE(res, onData) {
    var reader = res.body.getReader();
    var dec = new TextDecoder();
    var buf = "";
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buf += dec.decode(chunk.value, { stream: true });
      var idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        var line = buf.slice(0, idx).replace(/\r$/, "");
        buf = buf.slice(idx + 1);
        if (!line || line[0] !== "d" || line.slice(0, 5) !== "data:") continue;
        var data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        onData(data);
      }
    }
  }

  async function streamGoogle(model, key, onDelta, signal) {
    var url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) + ":streamGenerateContent?alt=sse";
    var contents = state.messages.map(function (m) {
      return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
    });
    var body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: contents.length ? contents : [{ role: "user", parts: [{ text: "hello" }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };
    var res = await fetch(url, {
      method: "POST",
      signal: signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await httpError(res, "Google");
    await readSSE(res, function (data) {
      try {
        var j = JSON.parse(data);
        var c = j.candidates && j.candidates[0];
        if (c && c.content && c.content.parts) {
          var t = c.content.parts.map(function (p) { return p.text || ""; }).join("");
          if (t) onDelta(t);
        }
      } catch (e) { /* partial line — ignore */ }
    });
  }

  async function streamOpenAICompat(provider, model, key, onDelta, signal) {
    var meta = CFG.providers[provider];
    var base = meta.api;
    var headers = { "Content-Type": "application/json", "Authorization": "Bearer " + (key || "no-key") };
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = location.origin;
      headers["X-Title"] = "Ada — Cardano AI Agent";
    }
    var messages = [{ role: "system", content: SYSTEM_PROMPT }].concat(
      state.messages.map(function (m) { return { role: m.role, content: m.content }; })
    );
    var res = await fetch(base + "/chat/completions", {
      method: "POST",
      signal: signal,
      headers: headers,
      body: JSON.stringify({ model: model, messages: messages, stream: true, temperature: 0.7, max_tokens: 1024 }),
    });
    if (!res.ok) throw await httpError(res, meta.label);
    await readSSE(res, function (data) {
      try {
        var j = JSON.parse(data);
        var ch = j.choices && j.choices[0];
        if (ch && ch.delta && ch.delta.content) onDelta(ch.delta.content);
      } catch (e) { /* ignore */ }
    });
  }

  /* ------------------------ puter (keyless) ------------------------ */
  function loadScript(src) {
    if (document.querySelector('script[src="' + src + '"]')) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("could not load puter.js from js.puter.com — check your connection")); };
      document.head.appendChild(s);
    });
  }
  function puterText(response) {
    if (response == null) return "";
    if (typeof response === "string") return response;
    var m = response.message || response;
    var c = m && m.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return c.map(function (b) { return b && (b.text != null ? b.text : (b.content || "")) || ""; }).join("");
    }
    return c != null ? String(c) : "";
  }
  async function streamPuter(model, onDelta, signal) {
    await loadScript("https://js.puter.com/v2/");
    if (typeof puter === "undefined" || !puter.ai || !puter.ai.chat) throw new Error("Puter.js loaded but puter.ai.chat is unavailable");
    var transcript = state.messages.map(function (m) {
      return (m.role === "user" ? "User: " : "Ada: ") + m.content;
    }).join("\n\n");
    var prompt = SYSTEM_PROMPT + "\n\n" + transcript + "\n\n(You are Ada. Reply only to the user's latest message.)";
    var response = await puter.ai.chat(prompt, { model: model });
    if (signal && signal.aborted) { var a = new Error("aborted"); a.name = "AbortError"; throw a; }
    var text = puterText(response).trim();
    if (!text) throw new Error("Puter returned an empty response.");
    onDelta(text);
  }

  async function onlineAnswer(text) {
    var meta = CFG.providers[state.provider];
    var key = currentKey();
    if (meta.needsKey && !key) {
      addMsg(
        "ada",
        "I'm pointed at **" + meta.label + "** but there's no API key saved in this browser. \n\n" +
          "Add one in the **API** panel (free at [" + (meta.keyHelp || "the provider console") + "](" + (meta.keyHelp || "") + ")), or type `key " + state.provider + " YOUR_KEY`. \n\n" +
          "Or switch me back: `provider local`."
      );
      return;
    }
    var model = currentModel();
    state.messages.push({ role: "user", content: text });

    var bubble = addMsg("ada", "");
    var acc = "";
    currentCtl = new AbortController();
    var timer = setTimeout(function () { currentCtl.abort(); }, 60000);

    try {
      if (state.provider === "google") {
        await streamGoogle(model, key, function (d) { acc += d; bubble.querySelector(".bubble").innerHTML = mdToHtml(acc); el.log.scrollTop = el.log.scrollHeight; }, currentCtl.signal);
      } else if (meta.kind === "puter") {
        await streamPuter(model, function (d) { acc += d; bubble.querySelector(".bubble").innerHTML = mdToHtml(acc); el.log.scrollTop = el.log.scrollHeight; }, currentCtl.signal);
      } else {
        await streamOpenAICompat(state.provider, model, key, function (d) { acc += d; bubble.querySelector(".bubble").innerHTML = mdToHtml(acc); el.log.scrollTop = el.log.scrollHeight; }, currentCtl.signal);
      }
      if (!acc) throw new Error("The provider returned an empty response.");
      state.messages.push({ role: "assistant", content: acc });
      faceReact(analyzeEmotion(acc));
      speak(acc);
    } catch (err) {
      bubble.remove();
      state.messages.pop(); // drop the user turn we added
      throw err;
    } finally {
      clearTimeout(timer);
      state.messages = state.messages.slice(-20);
      saveState();
      currentCtl = null;
    }
  }

  /* ------------------------------ send ------------------------------- */
  function send() {
    if (busy) {
      if (currentCtl) currentCtl.abort();
      return;
    }
    var text = el.input.value.trim();
    if (!text) return;
    stopSpeech();
    if (FACE) { FACE.pulse(); FACE.setEmotion("thinking"); }
    el.input.value = "";
    autoGrow();
    addMsg("user", text);
    setBusy(true);
    var thinking = addThinking();
    var done = (isCommand(text) ? handleCommand(text) : state.provider === "local" ? localAnswer(text) : onlineAnswer(text)).catch(function (err) {
      var msg = err && err.name === "AbortError"
        ? "Stopped."
        : "**Something went wrong.** " + (err && err.message ? err.message : String(err)) + "\n\nTip: check the key/model in the **API** panel, or switch brains with `provider local`.";
      addMsg("ada", msg);
    });
    done.finally(function () {
      if (thinking.parentNode) thinking.remove();
      setBusy(false);
    });
  }

  /* --------------------------- provider UI --------------------------- */
  function setProvider(name) {
    state.provider = name;
    saveState();
    refreshProviderUI();
  }
  function refreshProviderUI() {
    var meta = CFG.providers[state.provider];
    el.providerSel.value = state.provider;
    el.keyWrap.style.display = meta.needsKey ? "" : "none";
    el.modelWrap.style.display = meta.needsModel === false ? "none" : "";
    el.providerBlurb.textContent = meta.blurb || "";
    if (meta.needsKey) {
      el.keyInput.value = state.keys[state.provider] || "";
      el.modelInput.value = state.models[state.provider] || meta.defaultModel;
      el.keyLink.href = meta.keyHelp || "#";
      el.keyLink.textContent = "Get a free key →";
    }
    var model = state.provider === "local" ? "ada-local-v1" : (state.models[state.provider] || meta.defaultModel);
    el.sub.textContent = meta.label + " · " + model + (meta.needsKey && state.keys[state.provider] ? " · key ✓" : meta.needsKey ? " · no key" : "");
    updateStatusChip();
  }
  function updateStatusChip() {
    var meta = CFG.providers[state.provider];
    var online = navigator.onLine;
    el.status.textContent = (online ? "ONLINE" : "OFFLINE") + " · " + (meta.needsKey ? meta.label.toUpperCase() : (state.provider === "local" ? "LOCAL BRAIN" : meta.label.toUpperCase()));
    el.status.classList.toggle("off", !online);
  }

  /* ------------------------------ wiring ----------------------------- */
  function autoGrow() {
    el.input.style.height = "auto";
    el.input.style.height = Math.min(72, el.input.scrollHeight) + "px";
  }
  function makeQR(container, text) {
    if (typeof window.qrcode !== "function") { container.innerHTML = ""; return; }
    try {
      var qr = window.qrcode(10, "M");
      qr.addData(text);
      qr.make();
      // Draw Cardano-blue modules on white (strict blue/white palette)
      var n = qr.getModuleCount();
      var s = 6, q = s * 2;
      var size = n * s + q * 2;
      var cv = document.createElement("canvas");
      cv.width = size; cv.height = size;
      var cx = cv.getContext("2d");
      cx.fillStyle = "#ffffff";
      cx.fillRect(0, 0, size, size);
      cx.fillStyle = "#0033ad";
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) cx.fillRect(q + c * s, q + r * s, s, s);
        }
      }
      container.innerHTML = "";
      var img = document.createElement("img");
      img.src = cv.toDataURL("image/png");
      img.alt = "QR code of the Cardano donation address";
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.imageRendering = "pixelated";
      container.appendChild(img);
    } catch (e) { container.innerHTML = ""; }
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  function wire() {
    el.send.addEventListener("click", send);
    el.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    el.input.addEventListener("input", autoGrow);

    el.clear.addEventListener("click", function () { clearChat(); });

    el.providerSel.addEventListener("change", function () {
      setProvider(el.providerSel.value);
      addMsg("system", "Brain switched → " + CFG.providers[state.provider].label);
    });

    el.settingsToggle.addEventListener("click", function () {
      var open = el.settings.classList.toggle("open");
      el.settingsToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    el.voiceBtn.addEventListener("click", function () {
      state.voice = !state.voice;
      saveState();
      refreshVoiceBtn();
      if (!state.voice) stopSpeech();
      toast(state.voice ? "Voice on — I'll read my answers aloud" : "Voice off");
    });

    if (el.voiceSel) {
      el.voiceSel.addEventListener("change", function () {
        state.voiceName = el.voiceSel.value || "auto";
        saveState();
        resolveVoice();
        toast(state.voiceName === "auto" ? "Auto voice — best female available" : "Voice: " + state.voiceName);
      });
    }
    if (el.voiceTest) {
      el.voiceTest.addEventListener("click", function () {
        var wasMuted = !state.voice;
        if (wasMuted) state.voice = true; // a preview always gets a voice
        resolveVoice();
        speak("Hi! I'm Ada, the AI agent of the Cardano blockchain. This is how I sound.");
        if (wasMuted) { state.voice = false; saveState(); refreshVoiceBtn(); }
      });
    }

    el.saveBtn.addEventListener("click", function () {
      if (CFG.providers[state.provider].needsKey) {
        state.keys[state.provider] = el.keyInput.value.trim();
        state.models[state.provider] = el.modelInput.value.trim() || CFG.providers[state.provider].defaultModel;
      }
      saveState();
      refreshProviderUI();
      el.keyInput.value = state.keys[state.provider] || "";
      toast("Settings saved (stored only in this browser)");
    });

    el.testBtn.addEventListener("click", testConnection);

    el.xLink.href = CFG.author.x;
    el.ghLink.href = CFG.author.github;
    el.donAddr.textContent = CFG.donation.address;
    el.donView.href = CFG.donation.explorer;
    makeQR(el.qr, "cardano:" + CFG.donation.address);

    // extra social links (top bar + footer)
    ["x-link-2", "x-link-3"].forEach(function (id) {
      var a = document.getElementById(id);
      if (a) a.href = CFG.author.x;
    });
    var gh2 = document.getElementById("gh-link-2");
    if (gh2) gh2.href = CFG.author.github;

    var copyBtn = document.getElementById("copy-addr");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        copyText(CFG.donation.address).then(function (ok) {
          var orig = copyBtn.dataset.orig || (copyBtn.dataset.orig = copyBtn.textContent);
          copyBtn.textContent = ok ? "Copied ✓" : "Copy failed";
          toast(ok ? "ADA address copied — thank you 🧊" : "Copy failed — select and copy manually");
          setTimeout(function () { copyBtn.textContent = orig; }, 1600);
        });
      });
    }

    var yearEl = document.querySelector("[data-year]");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    window.addEventListener("online", updateStatusChip);
    window.addEventListener("offline", updateStatusChip);
  }

  /* --------------------------- test connection ----------------------- */
  async function testConnection() {
    var meta = CFG.providers[state.provider];
    if (state.provider === "local") {
      addMsg("ada", "Local Ada needs no key — I run entirely in your browser. ✓");
      return;
    }
    var key = currentKey();
    if (meta.needsKey && !key) { toast("Add an API key first"); el.keyInput.focus(); return; }
    var model = currentModel();
    addMsg("system", "Testing " + meta.label + " with `" + model + "`…");
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 20000);
    try {
      var detail = "";
      if (state.provider === "google") {
        var r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
          {
            method: "POST",
            signal: ctl.signal,
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with exactly one word: pong" }] }], generationConfig: { maxOutputTokens: 16 } }),
          }
        );
        if (!r.ok) throw await httpError(r, "Google");
        var j = await r.json();
        detail = ((j.candidates || [])[0] || {}).content && (j.candidates[0].content.parts || []).map(function (p) { return p.text; }).join("") || "";
      } else if (meta.kind === "puter") {
        await loadScript("https://js.puter.com/v2/");
        if (typeof puter === "undefined" || !puter.ai || !puter.ai.chat) throw new Error("Puter.js is unavailable in this browser");
        var rp = await puter.ai.chat("Reply with exactly one word: pong", { model: model });
        detail = puterText(rp) || "";
      } else {
        var base = meta.api;
        var headers = { "Content-Type": "application/json", "Authorization": "Bearer " + (key || "no-key") };
        if (state.provider === "openrouter") { headers["HTTP-Referer"] = location.origin; headers["X-Title"] = "Ada — Cardano AI Agent"; }
        var r2 = await fetch(base + "/chat/completions", {
          method: "POST",
          signal: ctl.signal,
          headers: headers,
          body: JSON.stringify({ model: model, max_tokens: 16, messages: [{ role: "user", content: "Reply with exactly one word: pong" }] }),
        });
        if (!r2.ok) throw await httpError(r2, meta.label);
        var j2 = await r2.json();
        detail = ((j2.choices || [])[0] || {}).message && j2.choices[0].message.content || "";
      }
      addMsg("ada", "✓ **Connection OK** — " + meta.label + " answered: “" + detail.trim() + "”\n\nI'm wired up and streaming. Ask me anything.");
    } catch (err) {
      addMsg("ada", "✗ **Test failed:** " + (err && err.name === "AbortError" ? "timeout" : (err && err.message ? err.message : String(err))) + "\n\nDouble-check the key and model name, then try again.");
    } finally {
      clearTimeout(timer);
    }
  }

  /* ------------------------------- boot ------------------------------ */
  function boot() {
    // populate provider select
    var frag = document.createDocumentFragment();
    Object.keys(CFG.providers).forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = CFG.providers[name].label;
      frag.appendChild(opt);
    });
    el.providerSel.appendChild(frag);

    wire();
    refreshProviderUI();
    refreshVoiceBtn();
    populateVoiceSelect();
    // don't speak on boot — browsers block speech before a user gesture
    addMsg("ada", CFG.agent.greeting, { speak: false });
    refreshPriceChip();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
