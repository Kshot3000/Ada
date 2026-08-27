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
      kind: "local",
      needsKey: false,
      needsModel: false,
      defaultModel: "ada-local-v1",
      keyHelp: null,
      blurb:
        "Runs entirely in your browser — no key, no network. A built-in Cardano knowledge base answers the common questions and handles every command.",
    },
    google: {
      label: "Google AI Studio (Gemini)",
      kind: "google",
      needsKey: true,
      defaultModel: "gemini-2.0-flash",
      keyHelp: "https://aistudio.google.com/apikey",
      blurb:
        "Google's Gemini API via AI Studio. Free tier available; the key is sent straight from your browser to Google.",
    },
    groq: {
      label: "Groq Cloud",
      kind: "openai",
      api: "https://api.groq.com/openai/v1",
      needsKey: true,
      defaultModel: "llama-3.3-70b-versatile",
      keyHelp: "https://console.groq.com/keys",
      blurb:
        "Groq's free LPU inference for open models — very fast. Grab a free key from the Groq console.",
    },
    openrouter: {
      label: "OpenRouter",
      kind: "openai",
      api: "https://openrouter.ai/api/v1",
      needsKey: true,
      defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
      keyHelp: "https://openrouter.ai/keys",
      blurb:
        "One key, many models. Pick any `:free` model on openrouter.ai/models for zero-cost answers.",
    },
    cerebras: {
      label: "Cerebras",
      kind: "openai",
      api: "https://api.cerebras.ai/v1",
      needsKey: true,
      defaultModel: "llama3.1-8b",
      keyHelp: "https://cloud.cerebras.ai/",
      blurb:
        "Cerebras' wafer-scale inference — among the fastest available. Free tier included; the key goes straight from your browser to Cerebras.",
    },
    mistral: {
      label: "Mistral AI",
      kind: "openai",
      api: "https://api.mistral.ai/v1",
      needsKey: true,
      defaultModel: "mistral-small-latest",
      keyHelp: "https://console.mistral.ai/",
      blurb:
        "Mistral's Mistral/Mixtral models with a daily free token quota. Grab a key from the Mistral console.",
    },
    huggingface: {
      label: "Hugging Face (Inference)",
      kind: "openai",
      api: "https://api-inference.huggingface.co/v1",
      needsKey: true,
      defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
      keyHelp: "https://huggingface.co/settings/tokens",
      blurb:
        "Hugging Face's free Inference API — 500K+ open-source models behind one free key.",
    },
    together: {
      label: "Together AI",
      kind: "openai",
      api: "https://api.together.xyz/v1",
      needsKey: true,
      defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      keyHelp: "https://api.together.ai/",
      blurb:
        "Together's 100+ open-source models. $5 of free credits on signup — the model name is editable in the panel.",
    },
    deepinfra: {
      label: "DeepInfra",
      kind: "openai",
      api: "https://api.deepinfra.com/v1/openai",
      needsKey: true,
      defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct",
      keyHelp: "https://deepinfra.com/dashboards/key",
      blurb:
        "DeepInfra's serverless model inference with free credits on signup.",
    },
    sambanova: {
      label: "SambaNova",
      kind: "openai",
      api: "https://api.sambanova.ai/v1",
      needsKey: true,
      defaultModel: "Meta-Llama-3.1-8B-Instruct",
      keyHelp: "https://cloud.sambanova.ai/",
      blurb:
        "SambaNova's fast inference platform with a free tier — great for Llama models.",
    },
    fireworks: {
      label: "Fireworks AI",
      kind: "openai",
      api: "https://api.fireworks.ai/inference/v1",
      needsKey: true,
      defaultModel: "accounts/fireworks/models/llama-v3p1-8b-instruct",
      keyHelp: "https://fireworks.ai/account/api-keys",
      blurb:
        "Fireworks' fast open-source inference — $1 of free credits on signup.",
    },
    aiml: {
      label: "AIML API",
      kind: "openai",
      api: "https://api.aimlapi.com/v1",
      needsKey: true,
      defaultModel: "meta-llama/llama-3.1-8b-instruct",
      keyHelp: "https://app.aimlapi.com/",
      blurb:
        "200+ models behind one unified API with a free tier included.",
    },
    novita: {
      label: "Novita AI",
      kind: "openai",
      api: "https://api.novita.ai/v1",
      needsKey: true,
      defaultModel: "meta-llama/llama-3.1-8b-instruct",
      keyHelp: "https://novita.ai/",
      blurb:
        "Novita's LLM and image APIs — $0.50 of free credits on signup.",
    },
    hyperbolic: {
      label: "Hyperbolic",
      kind: "openai",
      api: "https://api.hyperbolic.xyz/v1",
      needsKey: true,
      defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
      keyHelp: "https://app.hyperbolic.xyz/",
      blurb:
        "Hyperbolic's open-source model hosting with a free tier.",
    },
    puter: {
      label: "Puter (no key needed)",
      kind: "puter",
      api: null,
      needsKey: false,
      defaultModel: "openai/gpt-5.4-nano",
      keyHelp: "https://developer.puter.com/",
      blurb:
        "Puter.js — free LLM access in the browser (400+ models) with no API key of your own. On first use Puter may ask the visitor to sign in to a free Puter account so usage is billed to them, not to you.",
    },
    ollama: {
      label: "Ollama (local runtime)",
      kind: "openai",
      api: "http://localhost:11434/v1",
      needsKey: false,
      defaultModel: "llama3.2",
      keyHelp: "https://ollama.com/download",
      blurb:
        "Run Ada on your own machine with Ollama — install from ollama.com, run `ollama pull llama3.2`, and pick the model. 100% offline, unlimited, no key.",
    },
    lmstudio: {
      label: "LM Studio (local runtime)",
      kind: "openai",
      api: "http://localhost:1234/v1",
      needsKey: false,
      defaultModel: "local-model",
      keyHelp: "https://lmstudio.ai/download",
      blurb:
        "Run Ada on your own machine with LM Studio — load a model, start the server (Developer tab), and pick the loaded model. 100% offline, unlimited, no key.",
    },
  },

  // Live ADA price (CoinGecko — free, no key, CORS open).
  priceApi:
    "https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd,eur&include_24hr_change=true",
};
