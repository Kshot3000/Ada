/* ============================================================
   ADA — AI Agent for the Cardano Blockchain
   ██████ CONFIG — EDIT YOUR DATA HERE ██████
   Your X profile, donation address and provider presets
   live in ONE place. Change a value here and it updates
   everywhere on the site (chat, support panel, README).
   ============================================================ */
"use strict";

window.ADA = window.ADA || {};

ADA.CONFIG = {
  agent: {
    name: "Ada",
    tagline: "AI Agent · Cardano Blockchain",
    greeting:
      "Hello — I'm **Ada**, the AI agent of the Cardano blockchain. \n\n" +
      "Ask me anything about Cardano, or try a command:\n" +
      "`help` · `about` · `cardano` · `price` · `donate` · `status`",
  },

  author: {
    name: "kshot",
    x: "https://x.com/kshot9000",
    xHandle: "@kshot9000",
    github: "https://github.com/Kshot3000",
    repo: "https://github.com/Kshot3000/Ada",
  },

  // Same Cardano wallet used across the earlier projects
  // (EUTXO.DEX, NightDream, Eclipse, Nocturne, The Cold Front).
  donation: {
    chain: "Cardano (ADA)",
    address:
      "addr1q8hnl6vl5a6k3rw3n5g3jtte696zcl76kfatzv7gpswa9r0dj7fma6klq55y4ffm7tf0em09udnyhuk4ah92pl5x9jpqjae44v",
    explorer:
      "https://cardanoscan.io/addresses/addr1q8hnl6vl5a6k3rw3n5g3jtte696zcl76kfatzv7gpswa9r0dj7fma6klq55y4ffm7tf0em09udnyhuk4ah92pl5x9jpqjae44v",
  },

  // Free AI API presets.
  // Keys are stored ONLY in the visitor's own browser (localStorage)
  // and sent directly to the chosen provider. There is no server.
  providers: {
    local: {
      label: "Local Ada (offline brain)",
      needsKey: false,
      defaultModel: "ada-local-v1",
      keyHelp: null,
      blurb:
        "Runs entirely in your browser — no key, no network. A built-in Cardano knowledge base answers the common questions and handles every command.",
    },
    google: {
      label: "Google AI Studio (Gemini)",
      needsKey: true,
      defaultModel: "gemini-2.0-flash",
      keyHelp: "https://aistudio.google.com/apikey",
      blurb:
        "Google's Gemini API via AI Studio. Free tier available; the key is sent straight from your browser to Google.",
    },
    groq: {
      label: "Groq Cloud",
      needsKey: true,
      defaultModel: "llama-3.3-70b-versatile",
      keyHelp: "https://console.groq.com/keys",
      blurb:
        "Groq's free LPU inference for open models — very fast. Grab a free key from the Groq console.",
    },
    openrouter: {
      label: "OpenRouter",
      needsKey: true,
      defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
      keyHelp: "https://openrouter.ai/keys",
      blurb:
        "One key, many models. Pick any `:free` model on openrouter.ai/models for zero-cost answers.",
    },
  },

  // Live ADA price (CoinGecko — free, no key, CORS open).
  priceApi:
    "https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd,eur&include_24hr_change=true",
};
