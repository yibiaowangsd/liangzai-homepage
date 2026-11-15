# Test I/O boundaries

`npm test` builds the application and runs every `tests/*.test.mjs` file. It does
not deploy the application or invoke a production publishing/subscription API.
Do not remove suites or replace this required check with a smaller selection.

## Application fetch

The Node test command preloads `fixtures/no-unmocked-fetch.mjs` in each test
process. The default `globalThis.fetch` rejects without calling a transport and
records the attempted method, origin and path. A final assertion fails the suite
even if application code catches that rejection. Query strings are not recorded.
Test-specific mocks can replace this default but must never delegate to a saved
real fetch. The preload is a regression guard, not an OS network sandbox.

- `rendered-html.test.mjs` installs the homepage featured-news fixture before
  importing the built Worker. It checks that the fixture title really rendered,
  that the fallback did not render, and that only the expected GET was requested.
- `news-rendering.test.mjs` and `news-navigation.test.mjs` install their news API
  mocks before importing the Worker. These are in-process `worker.fetch()` calls,
  not HTTP calls to the domain in the incoming `Request` object.
- Subscription, robot, weekly and resend tests call the imported Worker or its
  functions with in-memory SQLite adapters, synthetic credentials and mocked
  provider fetch functions. These mocks collect payloads and return local
  `Response` objects. They do not contact real subscribers or delivery providers.

## Worker-runtime integration

Miniflare tests need local runtime IPC/loopback sockets. `dispatchFetch()` sends
the incoming request to that local runtime; its Request URL does not make it a
request to the public site's API.

- `news-robot-runtime.test.mjs` supplies a fake `outboundService` which records
  calls and returns synthetic success/redirect responses.
- `news-read-runtime.test.mjs` supplies a rejecting `outboundService` and asserts
  that no outgoing request was attempted, including requests caught by the app.
- Both use local D1 databases and dispose the runtime after the test.

## Other executable fixtures

The NGCC tests load checked-in WASM bytes from disk. Their subprocesses run the
local `scripts/check-ngcc-module.mjs`; no download step is part of these tests.
The Python subprocesses run the local edition validator or parameter selector.
The SSR timer test imports a locally built module in a Node subprocess.

This audit covers the repository's current test entry points and their explicit
fixtures. It does not prove that arbitrary future code or dependency changes are
network-free. Review new I/O, direct HTTP clients, subprocesses and Miniflare
outbound configuration when adding tests.
