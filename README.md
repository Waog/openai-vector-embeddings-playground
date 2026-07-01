# OpenAI Vector Embeddings Playground

A small, browser-only React + TypeScript + Vite app for experimenting with
[OpenAI text embeddings](https://developers.openai.com/api/docs/guides/embeddings):
paste your own API key, enter a batch of text inputs, fetch embeddings,
inspect cosine similarities, and visualize the results in 2D via PCA.

There is **no backend**. Everything runs in your browser and talks directly
to the OpenAI API.

## ⚠️ Security warning — read this first

This app calls the OpenAI Embeddings API **directly from client-side
JavaScript in your browser**, using an API key you paste into the UI. That
means:

- Your API key is present in this page's memory and is sent as a header on
  every request your browser makes to OpenAI.
- Anyone with access to your browser's dev tools, network inspector, or
  (if you enable "remember") this browser profile's localStorage can read it.
- This is fundamentally different from a production setup, where the API key
  should live only on a server you control.

**Only use this tool with an API key you own and control**, ideally one you
can rotate/revoke easily, and treat it as a local/private developer tool —
not something to share publicly with your key active. See OpenAI's
[API key safety best practices](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
for more background, and the
[TypeScript/JavaScript SDK docs](https://developers.openai.com/api/reference/typescript/)
for why the official SDK requires an explicit "I understand the risk" flag to
run in a browser at all (this app uses plain `fetch` instead — see
[src/lib/openaiEmbeddings.ts](src/lib/openaiEmbeddings.ts)).

By default, the API key is kept only in memory (React state) and is cleared
when you reload the page. There is an optional "Remember API key in
localStorage" checkbox if you want it to persist across reloads on your own
machine — it comes with its own warning in the UI.

This app does not include any analytics, tracking, or telemetry, and does not
send your inputs or embeddings anywhere other than directly to OpenAI's API.

## Features

- Paste an API key locally (show/hide toggle, optional localStorage persistence).
- Enter many text inputs, one per line.
- Choose between `text-embedding-3-small` (default) and `text-embedding-3-large`,
  with an optional `dimensions` override.
- Batches all inputs into a single embeddings request per fetch.
- Caches embeddings in `localStorage`, keyed by model + dimensions + input
  text, so re-fetching identical inputs never calls the API again (the API
  key itself is never cached).
- Cosine similarity matrix for all fetched inputs.
- "Select a query input, rank everything else by similarity" view.
- 2D PCA scatter plot of the embeddings, with a clear disclaimer that it's an
  approximation.
- Export/import the full experiment (model, dimensions, inputs, embeddings,
  similarities) as JSON, so you can reload results without calling OpenAI again.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL, paste your OpenAI API key, enter some
inputs (or click "Load example set"), and click "Fetch embeddings".

### Other scripts

```bash
npm run build    # type-check + production build into dist/
npm run preview  # locally preview the production build
npm run lint     # run ESLint
```

## How it works

- **`src/lib/openaiEmbeddings.ts`** — calls the OpenAI REST embeddings
  endpoint (`POST https://api.openai.com/v1/embeddings`) directly with
  `fetch`, sending `input: string[]` and `model`, and mapping the response
  back to inputs by the `index` field OpenAI returns (rather than assuming
  order is preserved).
- **`src/lib/cache.ts`** — a simple `localStorage`-backed cache keyed by
  `model + dimensions + trimmed input text`. Never stores the API key.
- **`src/lib/similarity.ts`** — cosine similarity (`dot(a,b) / (|a| * |b|)`),
  computed defensively (embeddings are usually pre-normalized by OpenAI, but
  norms are computed anyway) — used for the similarity matrix and rankings.
  This always operates on the original high-dimensional embeddings.
- **`src/lib/pca.ts`** — deterministic PCA projection to 2D for the scatter
  plot only. Because embeddings can have hundreds/thousands of dimensions
  while the number of inputs is small, this uses the "dual PCA" trick:
  eigen-decomposing the small `n x n` Gram matrix (`X · Xᵀ`) via power
  iteration instead of the large `d x d` covariance matrix. See the comments
  in that file for the full explanation. Power iteration uses a fixed
  (non-random) starting vector and a fixed number of steps, so results are
  reproducible for the same input embeddings — this is an approximation of
  exact eigen-decomposition, but is effectively exact for visualization at
  this scale.
- **`src/components/`** — one component per UI concern (API key input, input
  editor, model selector, similarity matrix, ranking list, scatter plot,
  export/import).

Token/cost estimation is intentionally **not** implemented — accurately
estimating OpenAI token counts requires a tokenizer, and a fake/rough
character-based estimate would be misleading, so it was left out rather than
faked.

## Deploying to GitHub Pages

`vite.config.ts` sets `base: './'` (a relative base path), which makes the
built app work regardless of which sub-path it's served from — including
`https://<user>.github.io/<repo>/`. This works because the app is a single
page with no client-side router. If you ever add routing or need an absolute
base path for some other reason, change `base` to `'/<repo-name>/'` instead.

### Option A: GitHub Actions (included)

This repo includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds the app and deploys `dist/` to GitHub Pages on every push to
`main`. To enable it:

1. Push this repository to GitHub.
2. In the repo settings, go to **Pages** and set the source to
   **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the Actions tab).

### Option B: Manual static deploy

Per [Vite's static deploy guide](https://vite.dev/guide/static-deploy):

```bash
npm run build
```

Then publish the contents of `dist/` to any static host (GitHub Pages,
Netlify, a plain web server, etc.) — see the
[GitHub Pages docs](https://docs.github.com/en/pages) for publishing a
folder directly if you're not using the included Actions workflow.

The app never requires a server at runtime — it's a static bundle that talks
directly to the OpenAI API from the browser.

## Notes and limitations

- This is a local/developer research tool, not a production application.
- No backend, no analytics/tracking, no third-party services other than
  OpenAI's own API.
- The 2D PCA scatter plot is an approximation for visualization; always use
  the similarity matrix / ranked list (computed on full-dimensional
  embeddings) for accurate similarity comparisons.
