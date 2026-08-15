# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run build          # tsc --noEmit typecheck, then vite build (emits dist/ + .d.ts)
npm run lint           # eslint (prettier runs as an eslint rule, so lint fails on format drift)
npm run format         # prettier --write .
npm test               # vitest (watch when TTY, single run in CI)
npm run test:browser   # only the "browser" project
```

Tests run in real Chromium via Playwright — `npx playwright install --with-deps chromium` is required before the first run.

Single file / single test:

```sh
npx vitest run test/plugin-host.test.ts
npx vitest run -t 'should create iframe'
```

There is no root `index.html`, so `npm run dev` has nothing to serve. To exercise the library by hand, use `examples/basic-example` (it depends on the root via `file:../../.`, so run `npm run build` at the root first, then `npm install && npm run dev` in the example).

`test/plugin-host.test.ts` covers the `srcdoc` path; `test/plugin-frame-src.test.ts` covers the `frameSrc` path against a real child document at `test/fixtures/child-frame.html`, which the vitest browser-mode dev server serves same-origin with the test page (so `allow-same-origin` exercises the narrowed `remoteOrigin`). A broken `remoteOrigin` shows up as `ready()` never resolving, so failures there are 15s timeouts rather than assertion errors.

Releasing: `npm version <patch|minor|major>` then `git push --follow-tags`. `.github/workflows/publish.yml` publishes via npm OIDC trusted publishing (no `NPM_TOKEN`) and verifies the tag matches `package.json`.

## Architecture

The library sandboxes untrusted code in an iframe and exposes a bidirectional RPC bridge over `MessageChannel`. Three source files carry the design:

**`src/childplugin.ts`** — contains `Connection`, the symmetric RPC base class used by _both_ sides, plus `ChildPlugin` (the in-iframe side). `Connection` gives each side:

- `remote`: a `Proxy` whose every property read returns a generated function that posts a `{type:'method'}` message and resolves on the reply. Property _writes_ on `remote` install a local method instead — that is how `application.foo = fn` inside the iframe makes `foo` callable from the host.
- `hasDefined` / `methodDefined()`: `{type:'method-defined'}` probe, since the `remote` proxy can never report a missing method (any read returns a function).
- Per-call reply channels: every request allocates a fresh `MessageChannel` and ships `port2` as a transferable; the reply closes it. There is no request-ID bookkeeping.
- `prepareMethods` / `completeMethods`: per-method hooks to reshape arguments before send and results after receive, so non-structured-cloneable values (`Headers`, `Response`, …) can cross the boundary.
- Errors are hand-serialized (`serializeError`) because `Error` objects lose their own enumerable props over `postMessage`.
- `service-method` is a separate message type from `method`, reserved for internal calls (`runCode`, `connected`) so plugin APIs cannot shadow them.

`setOptions` sets `Connection#remote` as the _prototype_ of `options.pluginObject`. That is why `window.application` in the iframe both forwards unknown calls to the host and accepts new method definitions.

**`src/pluginframe.ts`** — `PluginFrame`, the host side. Creates a 0×0 sandboxed iframe (`allow-scripts` only, by default), waits for `onload`, then posts `{type:'init'}` with `port2` of a new `MessageChannel`; the child replies by calling the `connected` service method, which resolves `ready()`. `remoteOrigin` stays `'*'` unless both `allow-same-origin` and `frameSrc.origin` are set.

**Inlining the child (the non-obvious part).** With no `frameSrc`, the iframe is built from a `srcdoc` string that embeds the entire compiled child. `pluginframe.ts` does `import compiledChildPlugin from './childplugin.ts?inline'`, and `minifyInlinePlugin` in `vite.config.ts` intercepts any `?inline` id, runs `esbuild.transform` on it (**transform, not bundle — imports are not resolved**), and returns the minified IIFE as a default-exported string with `var ChildPlugin = ChildPluginModule.default` appended.

Consequence: **`src/childplugin.ts` must never gain a value import.** Its `./types` import survives only because it is types-only and erased by esbuild; any runtime import would emit a bare `import` statement into an IIFE and silently break every `srcdoc` iframe (the tests would fail at `ready()` with no useful message).

**Entry points.** `src/index.ts` (both sides), `src/host.ts` (`PluginFrame` only), `src/child.ts` (`ChildPlugin` + `Connection`) map to the `.`, `./host`, and `./child` export conditions. Consumers loading the child in a separate document import `./child` so they do not pull the host into the sandbox. Keep the three entry points and the `exports` map in `package.json` in sync when adding public API.
