/* ============================================================
   Ada — offline knowledge base (js/knowledge.js)
   ------------------------------------------------------------
   Distilled from the Cardano ecosystem's own sources of truth:
   - cardano.org / developers.cardano.org
   - github.com/cardano-foundation
   - github.com/IntersectMBO/cardano-node
   - github.com/input-output-hk + iohk.io
   - github.com/midnightntwrk + midnight.network
   - github.com/minswap + minswap.org
   - github.com/SundaeSwap-finance + sundae.fi

   Zero dependencies, zero network calls — Ada keeps answering
   with this even fully offline. Loaded before js/ada.js, which
   exposes it as window.ADA_KB and queries it first in localAnswer().

   Entry shape: { k: [keywords], t: markdown answer }
   Scoring: whole-token keyword matches (word-boundary safe).
     multi-word keyword  → 3 pts each
     single word ≥4 chars → 2 pts each
     short words         → 1 pt each
   Best entry wins; a score of ≥2 is required to answer,
   otherwise Ada falls through to her other skills.
   Order matters on ties: specific entries come first,
   the generic "Cardano" entry last.
   ============================================================ */
(function () {
  "use strict";

  var ENTRIES = [

    /* ------------------------- Midnight ------------------------- */
    {
      k: ["midnight", "midnight network", "midnight foundation", "night", "dust", "compact", "selective disclosure", "privacy", "zk"],
      t:
        "**Midnight is live** — the fourth-generation privacy blockchain in the Cardano ecosystem, built for real-world adoption with [programmable privacy](https://midnight.network/).\n\n" +
        "- **Hybrid model** — moves UTXOs *and* account-style contract state in a single atomic step.\n" +
        "- **Dual-state ledger** — a public on-chain state and a private local state that interact via ZK proofs.\n" +
        "- **Selective disclosure** — protect all user data, disclose only what's necessary, when it's necessary.\n" +
        "- **NIGHT → DUST** — NIGHT is the unshielded utility token that continuously generates DUST, the resource that powers transactions: a predictable cost model.\n" +
        "- **Compact** — write private + public state in one contract, no ZK expertise required.\n\n" +
        "Use cases: private lending, institutional execution & prime brokerage, regulated RWA tokenization, and reusable identity (verifiable credentials / passport). Governance runs on **MIPs** — Midnight Improvement Proposals. Code lives at [github.com/midnightntwrk](https://github.com/midnightntwrk).",
    },

    /* -------------------------- Minswap ------------------------- */
    {
      k: ["minswap", "min token", "min staking", "min-ada", "min/ada"],
      t:
        "**Minswap** is a leading multi-pool **DEX on Cardano** — low-fee swaps, some of the deepest liquidity on-chain, liquidity pools, staking, farming, and community-driven governance.\n\n" +
        "Their own numbers: **₳10.27B+ traded**, **6,428,749 successful trades**, **₳65.86M TVL**, **262,424 active traders**.\n\n" +
        "**MIN** is the token: soft-stake MIN to earn rewards and boost your portfolio, or add tokens to a pool (like MIN–ADA) to earn trading fees. App: [minswap.org](https://minswap.org) · docs: [docs.minswap.org](https://docs.minswap.org) · code: [github.com/minswap](https://github.com/minswap).",
    },

    /* ------------------------ SundaeSwap ------------------------ */
    {
      k: ["sundaeswap", "sundae", "liquid staking", "sundae token", "sundae labs"],
      t:
        "**SundaeSwap** is a DEX and **liquid staking** protocol on Cardano, run by **Sundae Labs** — a large-scale public utility handling **₳1.29B+ in trading volume**.\n\n" +
        "Stake ADA and keep it liquid as **SUNDAE** (use it in DeFi while it keeps staking), swap on their multi-pool, or provide liquidity and earn fees.\n\n" +
        "Their open stack includes the official **sundae-sdk**, reusable **Aiken** libraries (*aicone*), the **kugo** Kupo client, and sundae-sync. App: [app.sundae.fi](https://app.sundae.fi/) · site: [sundae.fi](https://sundae.fi) · code: [github.com/SundaeSwap-finance](https://github.com/SundaeSwap-finance).",
    },

    /* ------------------------ cardano-node ---------------------- */
    {
      k: ["cardano node", "cardano-node", "run a node", "run the node", "node operator", "stake pool", "mainnet", "preprod", "preview", "block production"],
      t:
        "**cardano-node** is the core executable for participating in the Cardano network — the point of integration for the **ledger** (what's valid), **consensus** (Ouroboros), and **networking** layers. It's the heart of every SPO, and the way to produce, validate, or explore blocks.\n\n" +
        "Maintained by **Intersect MBO** under Apache-2.0 (~3,200 GitHub stars), written in Haskell. Supports **Mainnet** plus the **Preprod** and **Preview** testnets. Setup is documented on the Cardano Developer Portal, and Intersect also runs the on-chain **Parameter Committee** — e.g. the recent proposal to lower `minPoolCost` to 75 ADA.\n\n" +
        "[github.com/IntersectMBO/cardano-node](https://github.com/IntersectMBO/cardano-node)",
    },

    /* ---------------------- Input Output (IOG) ------------------ */
    {
      k: ["input output", "iohk", "iog", "io global", "hoskinson", "io labs"],
      t:
        "**Input Output** (IOG, formerly IOHK) is the world's leading blockchain research and engineering company — and the company that **built Cardano**, founded by **Charles Hoskinson**. 600+ people across 50+ countries.\n\n" +
        "Their research division publishes **peer-reviewed work** in cryptography, distributed systems, and formal methods. Products and ventures: **Lace** (wallet), **Blockfrost** (Cardano API platform), **Djed** (stablecoin), **Catalyst** (community governance), **Identus** (decentralized identity), **Pogun** (Bitcoin–Cardano bridge), **RealFi** (DeFi). Research lines include **Hydra** and **Leios**.\n\n" +
        "“At Input Output, we don't just support ventures. We open doors.” — [iohk.io](https://iohk.io) · code: [github.com/input-output-hk](https://github.com/input-output-hk)",
    },

    /* --------------------- Cardano Foundation ------------------- */
    {
      k: ["cardano foundation", "cardanofoundation", "cf summit", "ballot"],
      t:
        "The **Cardano Foundation** (Zug, Switzerland) is the community-facing organization of the Cardano ecosystem — ecosystem programs, governance support, and open-source tooling.\n\n" +
        "Repos I can vouch for: **cardano-wallet** (UTxO & HD wallet management, HTTP server + CLI), **hermes-relayer** (Cardano's IBC relayer, written in Rust), **go-cip-30** (CIP-30 data-signature verification), **Reeve** (Ledger on the Blockchain — accounting on-chain), and the **Ballot** app that powered Cardano Summit e-voting.\n\n" +
        "[github.com/cardano-foundation](https://github.com/cardano-foundation) · [cardanofoundation.org](https://cardanofoundation.org)",
    },

    /* ------------------------- Governance ----------------------- */
    {
      k: ["governance", "drep", "delegated representative", "constitutional committee", "treasury", "voting", "on-chain voting"],
      t:
        "Cardano's **on-chain governance** (since the Conway era) lets ADA holders vote directly on **governance actions** — protocol parameters, treasury withdrawals, constitutional changes — or delegate their vote to a **DRep** (Delegated Representative). **SPOs** vote too, and a **Constitutional Committee** keeps the rules coherent.\n\n" +
        "Recent moves: the **Constitutional Amendment Portal** (alpha testing) gives the community a structured place to propose and refine changes to the Cardano Constitution, and live votes have covered things like lowering `minPoolCost` to 75 ADA and raising Plutus memory limits. That's the point: the community steers the protocol, not a company.",
    },

    /* --------------------------- Staking ------------------------ */
    {
      k: ["staking", "stake", "delegate", "delegation", "stake pool", "spo", "rewards", "apy", "earn ada"],
      t:
        "On Cardano you **delegate** your ADA to a **Stake Pool Operator (SPO)** — you keep full ownership, your funds are never locked, and you can switch pools any time. You earn a share of the pool's rewards at the end of each **epoch** (≈5 days).\n\n" +
        "Rewards come from two sources: **transaction fees** and a finite **ADA reserve**. The pool keeps a small fee plus a fixed cost to cover running the node; the rest is split among members proportionally to stake. Prefer more? Run your own pool — delegation just means other people's stake counts toward the pool's chance of being elected slot leader.",
    },

    /* ---------------------- Epochs & slots ---------------------- */
    {
      k: ["epoch", "slots", "slot", "leader schedule", "432,000", "21,600"],
      t:
        "An **epoch** is Cardano's unit of time — **432,000 one-second slots** on mainnet, roughly **5 days**. In each slot, zero or more stake pools may be nominated **slot leader**; on average a block is produced every ~20 seconds, about **21,600 blocks per epoch**.\n\n" +
        "At the epoch boundary the leader schedule rotates, the active SPO set updates, and the epoch's rewards get settled. Bigger picture: this is how Ouroboros stays both decentralized and predictable.",
    },

    /* -------------------------- Ouroboros ----------------------- */
    {
      k: ["ouroboros", "consensus", "proof of stake", "proof-of-stake", "slot leader", "praos", "leader election"],
      t:
        "**Ouroboros** is Cardano's family of proof-of-stake consensus protocols — the **first peer-reviewed, verifiably secure PoS protocol** ever deployed.\n\n" +
        "Time is divided into **1-second slots** grouped into **epochs**; each slot's leader is chosen by a stake-weighted random lottery, and the protocol is provably secure as long as **more than 51% of the stake is honest**. Variants: **Praos** (adaptive leader election), **Genesis** (chain selection + dynamic availability). It scales by adding nodes, not hardware — up to **4,000,000× the energy efficiency of Bitcoin**.\n\n" +
        "The academic roots: Ouroboros Praos (eprint 2017/573) and Ouroboros Genesis (2018/378).",
    },

    /* ---------------------- Eras & hard forks ------------------- */
    {
      k: ["eras", "byron", "shelley", "mary", "alonzo", "babbage", "chang", "conway", "hard fork"],
      t:
        "Cardano evolves in hard-fork **eras**: **Byron** (genesis) → **Shelley** (full proof-of-stake) → **Mary** (native multi-asset tokens) → **Alonzo** (Plutus smart contracts) → **Babbage** (EUTXO upgrades) → **Chang** (CIP-1694 / 1695 / 1696) → **Conway** (on-chain governance).\n\n" +
        "Each era ships research first, then code — no big-bang rewrites, just measured, peer-reviewed upgrades.",
    },

    /* ---------------------------- EUTXO ------------------------- */
    {
      k: ["eutxo", "utxo", "unspent", "account model"],
      t:
        "The **EUTXO model** (Extended UTxO) is Cardano's way of accounting for state. Instead of a mutable balance, the ledger is a set of **unspent outputs** — each one carries ADA, optional native tokens, and optional script conditions.\n\n" +
        "Every transaction spends old outputs and creates new ones, which makes the protocol deterministic, composable, and ideal for smart contracts. Cardano also supports an account-style view on top, which Midnight builds on for its hybrid model.",
    },

    /* ---------------------- Plutus & smart contracts ------------ */
    {
      k: ["plutus", "smart contract", "smart contracts", "aiken", "haskell", "contract"],
      t:
        "Cardano's smart contracts run on the EUTXO model, written in **Plutus** — a Haskell-based contract language activated in the Alonzo era. **Aiken** is the newer smart-contract language for Cardano (SundaeSwap ships reusable Aiken libraries, *aicone*).\n\n" +
        "The protocol keeps growing: a **Plutus memory-limits increase** went through on-chain voting, and new Plutus built-ins are in active development.",
    },

    /* --------------------------- Wallets ------------------------ */
    {
      k: ["wallet", "lace", "daedalus", "yoroi", "eternl"],
      t:
        "Popular Cardano wallets: **Lace** (Input Output's wallet — v2.2 added Bitcoin hardware-wallet support), **Daedalus** (full node, desktop), **Yoroi** (browser + mobile, lightweight), and **EternL** (browser extension, dApp-first).\n\n" +
        "For donating you only need a receiving address — run `donate` and I'll give you the ADA address.",
    },

    /* ------------------------ Scaling research ------------------ */
    {
      k: ["hydra", "leios", "state channel", "scaling", "scale"],
      t:
        "Cardano's scaling research, both out of Input Output: **Hydra** — a state-channel protocol where many parallel “heads” process transactions and settle to mainnet (Hydra 2.3.0 shipped snapshot-processing speedups) — and **Leios** — a next-generation consensus prototype with **endorser block certification**, aiming for high throughput without centralization.\n\n" +
        "In short: Hydra for throughput, Leios for the consensus of the future.",
    },

    /* ------------------- Interoperability & bridges -------------- */
    {
      k: ["ibc", "interoperability", "injective", "bridge", "pogun", "cosmos"],
      t:
        "Cardano is wiring itself into the wider web of chains: **Cardano and Injective connected via IBC on testnet** (August 2026), with the Cardano Foundation's **hermes-relayer** (Rust) as the Cardano-side IBC implementation.\n\n" +
        "**Pogun** is a Bitcoin–Cardano bridge opening the door to Bitcoin DeFi. The direction of travel: interoperable, not isolated.",
    },

    /* ----------------------- The ADA token ---------------------- */
    {
      k: ["ada token", "ada supply", "how many ada", "ada cap", "lovelace", "45 billion", "max supply", "supply"],
      t:
        "**ADA** is Cardano's native token — the unit of value for payments, staking, and governance. Hard cap: **45 billion ADA** — no premine, no ICO.\n\n" +
        "New ADA is issued as staking rewards from a finite reserve, so the cap is approached asymptotically. The smallest unit is the **lovelace**: 1 ADA = 1,000,000 lovelaces — named, fittingly, after Ada Lovelace.",
    },

    /* ------------------------ DeFi ecosystem --------------------- */
    {
      k: ["defi", "ecosystem", "dapp", "dapps", "decentralized exchange", "dex", "yield"],
      t:
        "Cardano's DeFi runs entirely on-chain via Plutus smart contracts. The leading venues: **Minswap** (₳10B+ traded, multi-pool swaps, MIN staking, farming) and **SundaeSwap** (₳1.29B+ volume, liquid staking with SUNDAE), plus stablecoins like **Djed** and the **Midnight** privacy layer for confidential finance.\n\n" +
        "Want to try it? Pick a DEX, connect a wallet, and start swapping — fees are paid in ADA.",
    },

    /* -------------------------- Security ------------------------- */
    {
      k: ["security", "secure", "censorship", "decentralization", "attack"],
      t:
        "Cardano's security story is unusually concrete: **Ouroboros** proof-of-stake with peer-reviewed proofs, a **51% honest-stake** security threshold, dynamic availability with a provable chain-selection rule, and up to **4,000,000× the energy efficiency** of Bitcoin's proof-of-work.\n\n" +
        "No permissioning, no single point of failure — that's what “censorship-resistant” means in practice.",
    },

    /* ------------------------- Research -------------------------- */
    {
      k: ["research", "peer reviewed", "peer-reviewed", "academic", "papers", "evidence based", "evidence-based"],
      t:
        "Cardano is the first blockchain founded on **peer-reviewed research** — Ouroboros Praos (eprint 2017/573), Ouroboros Genesis (2018/378), and a decade of ongoing work from Input Output on cryptography, consensus, game theory, and formal methods.\n\n" +
        "“Evidence-based development” means every protocol change is argued, proven, and published before it ships. That's the research-first way.",
    },

    /* ----------------------- Getting started --------------------- */
    {
      k: ["get started", "getting started", "how do i start", "beginner", "buy ada", "first steps", "how to use"],
      t:
        "Getting started on Cardano, step by step:\n\n" +
        "**1)** Grab a wallet — Lace, Yoroi, Daedalus, or EternL.\n" +
        "**2)** Buy ADA on a major exchange.\n" +
        "**3)** Send it to your address.\n" +
        "**4)** Delegate to a stake pool and start earning rewards (no lock-up).\n" +
        "**5)** Explore the ecosystem — swap on Minswap or SundaeSwap, or try Midnight for private apps.\n\n" +
        "Type `donate` and I'll show you a live ADA receiving address.",
    },

    /* ------------------- Charles Hoskinson ---------------------- */
    {
      k: ["charles", "founder", "who created cardano", "who built cardano"],
      t:
        "**Charles Hoskinson** is the founder of **Input Output (IOG)** — the company that built Cardano — and a co-founder of Ethereum. He's the public face of Cardano's research-first philosophy: peer-reviewed protocols, evidence-based development, and long-term thinking over hype.",
    },

    /* -------------------- What is Cardano (generic) ------------- */
    {
      k: ["cardano", "blockchain", "layer 1", "layer-1", "l1"],
      t:
        "**Cardano** is a proof-of-stake layer-1 blockchain — the first built on **peer-reviewed academic research** and developed through evidence-based methods. Its mission, straight from [cardano.org](https://cardano.org/): *Making the World Work Better for All* — the most secure, reliable, and censorship-resistant chain for mission-critical applications.\n\n" +
        "It runs the **Ouroboros** consensus, its native asset is **ADA**, and it's one of the longest-running PoS networks in the world. Ask me about staking, epochs, governance, Midnight, Minswap, SundaeSwap, or running a node.",
    },
  ];

  /* --------------------------- engine --------------------------- */
  function occurrences(hay, needle) {
    var c = 0, i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) { c++; i += needle.length; }
    return c;
  }

  /* normalize: lowercase, punctuation → space, collapse runs.
     "What is Midnight?" → "what is midnight" so whole-token
     matching isn't broken by ? ! , . - / */
  function norm(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ");
  }

  function kwScore(kw) {
    if (kw.indexOf(" ") !== -1) return 3; // multi-word = very specific
    if (kw.length >= 4) return 2;
    return 1;
  }

  function score(text, entry) {
    var hay = " " + norm(text) + " "; // padded → whole-token matches
    var s = 0;
    for (var i = 0; i < entry.k.length; i++) {
      var kw = norm(entry.k[i]);
      var n = occurrences(hay, " " + kw + " ");
      if (n) s += kwScore(kw) * n;
    }
    return s;
  }

  function ask(text) {
    if (!text) return null;
    var best = null, bestScore = 0;
    for (var i = 0; i < ENTRIES.length; i++) {
      var sc = score(text, ENTRIES[i]);
      if (sc > bestScore) { bestScore = sc; best = ENTRIES[i]; }
    }
    return (best && bestScore >= 2) ? best.t : null;
  }

  /* expose for ada.js (and tests) */
  window.ADA_KB = {
    entries: ENTRIES,
    ask: ask,
    size: ENTRIES.length,
  };
})();
