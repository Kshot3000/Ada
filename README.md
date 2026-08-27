# Ada — AI Agent for the Cardano Blockchain

**Ada** is an AI agent working for the Cardano blockchain — a single-page, zero-server website you can run anywhere and post to GitHub. Deep Cardano blue and white, with Ada's animated **portrait** — long hair, expressive eyes, full lips (she blinks, watches you, talks, and shows emotion), a Matrix-style glyph rain behind her, and a chat console where you ask Ada questions and issue commands.

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

## Ada's face & voice

Ada isn't a logo — she's a **procedural vector portrait**: long periwinkle hair with side-swept fringe and framing strands, almond eyes with irises, glints and lashes, brows, a subtle nose, full blue lips, cheek blush, earrings, neck and shoulders — drawn with canvas bezier paths in white and Cardano blue over the deep-blue Matrix rain, with bittensor-style energy particles orbiting her.

- **Emotions** — Ada's reply text is analyzed and she reacts with one of 9 expressions: `neutral`, `happy`, `excited`, `sad`, `surprised`, `thinking`, `talking`, `listening`, `confused`. Brows, eyes, mouth, and head tilt animate smoothly between states, and a small chip in the hero shows her current emotion.
- **Alive** — she blinks every few seconds, her gaze follows your cursor, the head bobs gently, and her mouth moves while she speaks.
- **Voice** — Ada reads her replies aloud with the Web Speech API (free, no API key). Siri/Cortana-class neural voices (Windows “Aria/Jenny Online (Natural)”, macOS “Samantha (Premium)”, Google UK English Female…) are preferred in order. The **🎙 voice picker** in the console lists every installed voice, **🎧** plays a sample of the current pick, and **🔊 / 🔇** toggles speech. Your choice is remembered per browser.
- **Matrix background** — a rain of pure binary `1`s and `0`s drifts *behind* her head — the rain dims as it passes under her, and a deep-blue stage clearing keeps her face clearly in front. On desktop she sits side-by-side with the chat console, so you can type to her and see her full face at the same time.

Notes:

- Browsers block speech until the visitor first interacts with the page, so the boot greeting is silent and her voice kicks in from your first message onward.
- If no speech engine is installed, Ada falls back to a simulated talking motion — everything else keeps working.
- Honors `prefers-reduced-motion`: the face renders one calm static frame and the rain stands still, while all chat and voice logic works unchanged.

## Ada's offline knowledge base

Ada's local brain (no API key, no network) is backed by **`js/knowledge.js`** — a scored keyword knowledge base distilled from the ecosystem's own sources, so she keeps answering even fully offline:

| Topic | Source |
|---|---|
| Cardano, Ouroboros, staking, epochs, ADA supply, eras, EUTXO | [cardano.org](https://cardano.org/) · [developers.cardano.org](https://developers.cardano.org) |
| Midnight — NIGHT, DUST, Compact, selective disclosure | [midnight.network](https://midnight.network/) · [github.com/midnightntwrk](https://github.com/midnightntwrk) |
| Minswap DEX, MIN staking, pool data | [minswap.org](https://minswap.org) · [github.com/minswap](https://github.com/minswap) |
| SundaeSwap DEX + liquid staking (SUNDAE) | [sundae.fi](https://sundae.fi) · [github.com/SundaeSwap-finance](https://github.com/SundaeSwap-finance) |
| cardano-node, Intersect, mainnet/preprod/preview | [github.com/IntersectMBO/cardano-node](https://github.com/IntersectMBO/cardano-node) |
| Input Output (IOG), Hoskinson, Hydra, Leios | [iohk.io](https://iohk.io) · [github.com/input-output-hk](https://github.com/input-output-hk) |
| Cardano Foundation, cardano-wallet, IBC relayer | [github.com/cardano-foundation](https://github.com/cardano-foundation) |

In chat: `knowledge` prints the full coverage list, or just ask — *what is Midnight?* · *how do I run a node?* · *what is SundaeSwap?*

## Commands

| Command | What it does |
|---|---|
| `help` | Full command list |
| `about` | Who Ada is |
| `cardano` | Cardano in 30 seconds |
| `knowledge` | What Ada's offline brain covers |
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
├── index.html          # the site (hero + Ada's face + chat console + support panel)
├── 404.html            # themed 404 for GitHub Pages
├── favicon.svg         # blue hexagon-A
├── css/styles.css      # deep Cardano blue & white responsive theme
└── js/
    ├── config.js       # ← EDIT ME: X, donation, provider presets
    ├── face.js         # Ada's portrait: hair, face, emotions, blink, gaze, talking
    ├── background.js   # Matrix-style binary rain (canvas)
    ├── knowledge.js    # offline Cardano knowledge base (no API, no network)
    ├── ada.js          # agent core: chat, providers, streaming, commands, voice
    └── vendor/qrcode.js# vendored QR generator (MIT, Kazuhiko Arase)
```

## Privacy & security

- **No backend, no analytics, no cookies.** Static files only.
- API keys are stored only in the visitor's own `localStorage` and sent only to the provider the visitor chose.
- The price feed (CoinGecko) and the AI APIs are the only network calls, and both are user-initiated or clearly labeled.
- All chat HTML is escaped before rendering (Markdown-lite).

## Notes

- Works offline except the `price` command (needs the CoinGecko API) — the offline brain covers everything else.
- Respects `prefers-reduced-motion` (static face + rain, no animation).
- QR code is generated locally with the vendored `qrcode.js` — zero network calls.
