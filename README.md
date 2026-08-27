# Ada — AI Agent for the Cardano Blockchain

**Ada** is an AI agent working for the Cardano blockchain — a single-page, zero-server website you can run anywhere and post to GitHub. White and Cardano-blue, with a bittensor.com-style animated 3D structure in the background and a chat console where you ask Ada questions and issue commands.

- **No build step, no server, no dependencies** — plain HTML/CSS/JS.
- **Runs 100% in the visitor's browser.** Ada works out of the box with her built-in **offline brain**, or you plug in any **free AI API** (Google AI Studio / Gemini, Groq Cloud, or OpenRouter) from the ⚙ API panel.
- **Your keys stay in your browser** (localStorage) and go straight to the provider. Nothing is stored anywhere else.
- Live ADA price (free CoinGecko API), donation QR code, X + GitHub links — all from one config file.

Built by **[@kshot9000](https://x.com/kshot9000)** · [github.com/Kshot3000](https://github.com/Kshot3000)

---

## Quick start (local)

Open `index.html` in a browser, or serve the folder:

```bash
# any static server works
python -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`. Ada greets you, the structure moves, and `help` lists every command.

## Deploy to GitHub Pages

The live repo is [github.com/Kshot3000/Ada](https://github.com/Kshot3000/Ada).

1. Push this folder (already done — the repo is up to date):

   ```bash
   cd ada-agent
   git init
   git add .
   git commit -m "Ada — AI agent for the Cardano blockchain"
   git branch -M main
   git remote add origin https://github.com/Kshot3000/Ada.git
   git push -u origin main
   ```

2. In the repo: **Settings → Pages → Build and deployment → Source: `main`**, folder `/(root)` → Save.
3. In ~1 minute the site is live at `https://Kshot3000.github.io/Ada/`.

That's it — no workflow file needed. The `404.html` handles unknown URLs automatically.

## Connect a free AI brain (optional)

Ada ships with a built-in offline brain (Cardano knowledge base + full command system). For open-ended questions, pick a free provider in the **⚙ API** panel — 17 brains in total:

| Provider | Free key from | Default model | Notes |
|---|---|---|---|
| **Local Ada** | — | — | Built-in offline brain, zero config (default) |
| **Google AI Studio (Gemini)** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `gemini-2.0-flash` | Generous free tier |
| **Groq Cloud** | [console.groq.com/keys](https://console.groq.com/keys) | `llama-3.3-70b-versatile` | Very fast (LPU) |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | any `:free` model | One key, many models |
| **Cerebras** | [cloud.cerebras.ai](https://cloud.cerebras.ai/) | `llama3.1-8b` | Free tier, very fast |
| **Mistral AI** | [console.mistral.ai](https://console.mistral.ai/) | `mistral-small-latest` | Daily free token quota |
| **Hugging Face** | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | `meta-llama/Llama-3.3-70B-Instruct` | Free Inference API |
| **Together AI** | [api.together.ai](https://api.together.ai/) | `Llama-3.3-70B-Instruct-Turbo` | $5 free credits |
| **DeepInfra** | [deepinfra.com](https://deepinfra.com/dashboards/key) | `Meta-Llama-3.1-8B-Instruct` | Free credits on signup |
| **SambaNova** | [cloud.sambanova.ai](https://cloud.sambanova.ai/) | `Meta-Llama-3.1-8B-Instruct` | Free tier |
| **Fireworks AI** | [fireworks.ai](https://fireworks.ai/account/api-keys) | `llama-v3p1-8b-instruct` | $1 free credits |
| **AIML API** | [app.aimlapi.com](https://app.aimlapi.com/) | `llama-3.1-8b-instruct` | Free tier, 200+ models |
| **Novita AI** | [novita.ai](https://novita.ai/) | `llama-3.1-8b-instruct` | $0.50 free credits |
| **Hyperbolic** | [app.hyperbolic.xyz](https://app.hyperbolic.xyz/) | `Llama-3.1-8B-Instruct` | Free tier |
| **Puter** | *no key needed* | `openai/gpt-5.4-nano` | Puter.js, 400+ models, keyless (visitor may sign in to a free Puter account) |
| **Ollama** | *no key needed* | `llama3.2` | Your own machine — unlimited, offline |
| **LM Studio** | *no key needed* | `local-model` | Your own machine — unlimited, offline |

Paste the key, hit **Save settings**, then **Test connection**. You can also switch from chat: `provider groq` and `key groq YOUR_KEY` (or any other provider name above).

> Free-API source list: [OuterSpacee/free-ai-apis](https://github.com/OuterSpacee/free-ai-apis#llm--text-generation). Model names are editable per provider in the panel — use whatever free model is available on your provider.

## Commands

| Command | What it does |
|---|---|
| `help` | Full command list |
| `about` | Who Ada is |
| `cardano` | Cardano in 30 seconds |
| `price` | Live ADA/USD + EUR + 24h change (CoinGecko) |
| `donate` | Cardano donation address + CardanoScan link |
| `x` / `twitter` / `follow` | Builder's X account |
| `github` / `source` | This open-source repo |
| `status` | Brain, model, key state, chat context |
| `provider <local\|google\|groq\|openrouter>` | Switch brains |
| `key <provider> <value>` | Set an API key from chat |
| `model <name>` | Set the model for the current provider |
| `clear` | Clear the chat |
| *anything else* | A question — or simple math, e.g. `21 * 37` |

## Configuration

Everything personal lives in **`js/config.js`** — your X account, GitHub, donation address, and the provider presets. Change it there and it updates across the chat, support panel, and page copy.

The Cardano donation address on this site is the same wallet used across the other projects (EUTXO.DEX, NightDream, Eclipse, Nocturne, The Cold Front):

```
addr1q8hnl6vl5a6k3rw3n5g3jtte696zcl76kfatzv7gpswa9r0dj7fma6klq55y4ffm7tf0em09udnyhuk4ah92pl5x9jpqjae44v
```

## Project structure

```
Ada/
├── index.html          # the site (hero + chat console + support panel)
├── 404.html            # themed 404 for GitHub Pages
├── favicon.svg         # blue hexagon-A
├── css/styles.css      # white & Cardano-blue responsive theme
└── js/
    ├── config.js       # ← EDIT ME: X, donation, provider presets
    ├── background.js   # the bittensor-style moving 3D structure (canvas)
    ├── ada.js          # agent core: chat, providers, streaming, commands
    └── vendor/qrcode.js# vendored QR generator (MIT, Kazuhiko Arase)
```

## Privacy & security

- **No backend, no analytics, no cookies.** Static files only.
- API keys are stored only in the visitor's own `localStorage` and sent only to the provider the visitor chose.
- The price feed (CoinGecko) and the AI APIs are the only network calls, and both are user-initiated or clearly labeled.
- All chat HTML is escaped before rendering (Markdown-lite).

## Notes

- Works offline except the `price` command (needs the CoinGecko API) — the offline brain covers everything else.
- Respects `prefers-reduced-motion` (static structure, no pulses).
- QR code is generated locally with the vendored `qrcode.js` — zero network calls.
