# Coherent layouts and background themes

## Scope

This redesign starts from `ca4a185` and is independent of the separately pending
static transition cache-path change. It does not edit cryptographic runtimes,
algorithm parameters, news collection, character assets, or cinematic sequences.

- Home: responsive cinematic introduction, three direct task entries, enlarged main heading
- Algorithm atlas: searchable four-algorithm catalog, honest local-run/reference labels,
  compact teaching sections, retained parameter and explanation interactions
- News: dated navigation grouped near categories; compact source visual and takeaway
  before the reading column; existing return context and content retained
- Profile/archive: consistent content width, shorter timeline and character dossier
- Gallery/story: readable control bars, touch targets, persistent story navigation
- Standalone laboratory/audit: matching palette, usable workspace and bounded audit table

## Theme contract

`public/theme/site-theme.js` is loaded synchronously in document heads before paint.
`liangzai-theme` is the only persistence key touched by theme code. No cryptographic
session storage or React subtree identity changes when choosing a theme.

Paper, Midnight, Mist and Sand share semantic `--theme-*` tokens. The system option
follows OS light/dark until a user explicitly chooses a palette. Invalid preferences
are ignored; blocked storage still permits an in-page choice. Static HTML selectors
and the React `useSyncExternalStore` selector use the same bootstrap. BFCache and
cross-tab preference changes synchronize the choice. Illustrations/canvas artwork
retain their actual colors; controls follow the palette.

New theme assets live outside the immutable `/assets` directory. Existing generated
about-push entry paths are intentionally unchanged by this patch.

## Verification boundary

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run validate:artifact`.
The full suite exercises real WASM algorithms; unsupported modules stay explicitly
skipped rather than being called passing implementations.

Automated tests cover palette selection, pre-paint bootstrap, storage denial, OS
fallback, cross-document synchronization, source palette contrast, rendered route
structure, news date/category return, model affordances and algorithm availability.
These tests do not substitute for rendered contrast and browser interaction review.

Before publication, visually review all route families at 390, 768 and 1440px with
the four themes. Test theme change without lab reset, full ML-KEM round trip,
lab → About → Back, news date/category/detail/back, model view/reset, story page
navigation, dialogs/focus, and reduced-motion. A cloud
browser cannot access the local development URL in this environment; authorized
preview transport is required for this visual gate.

## Responsive browser checks

`npm run test:layout` serves the production artifact with the committed news edition
as a fixture and checks Chromium, Firefox and WebKit. Eleven viewports from 320px
to 2560px cover portrait, landscape and short desktop windows across ten route
families. The checks measure actual overflow, masthead collisions, home action/footer
overlap, the directory, theme selection and the retired `/observatory` redirect.
The frontend workflow installs the three browser engines and retains screenshots.

Only the homepage main heading is enlarged. It scales from 52px to 112px; its
content-driven hero has no clipping height. Shared masthead styles own laboratory
branding too. Gutters use the available document width, theme selects use a shared
arrow, and viewport height and color mixing have CSS fallbacks. The retired
Observatory's interface and navigation entries are removed; model assets stay in
their existing directory because the gallery and transitions still use them.
