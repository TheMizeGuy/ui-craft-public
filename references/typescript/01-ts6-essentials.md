---
topic: typescript
role: reference
scope: ts6-essentials
audience: ui-engineer
---

# TypeScript 6/7 Essentials for UI Engineers

Covers the TS 6.0 language baseline (released 2026-03-23, the stable line), the TypeScript 7 typecheck gate every UI project should run, the tsconfig that any new UI project should ship with, the strictness-ladder for legacy projects, the deprecation warnings that become hard failures in TS 7, and the anti-patterns no UI PR should pass review.

## What changed in TS 6.0

| Area | TS 5.9 default | TS 6.0 default | Why this matters for UI |
|---|---|---|---|
| `strict` | `false` | **`true`** | Strict-null + `noImplicitAny` are on by default; component prop bugs surface at edit time |
| `types` | inferred from `node_modules/@types/*` | **`[]`** | No more accidental `jest`/`mocha` globals leaking into a Vite app; opt in explicitly |
| `rootDir` | longest common ancestor of input files | **dir of `tsconfig.json`** | Predictable `outDir` shape; prevents flattened `dist/` surprises in monorepos |
| `noUncheckedSideEffectImports` | `false` | **`true`** | `import "./foo.css"` now errors if `foo.css` (or its `.d.ts` shim) is missing, which catches dead style imports |
| `module` default | `commonjs` | `esnext` (set explicitly anyway) | Apps and libraries align with bundler/runtime ESM |
| `moduleResolution` | `node`/`node10` | legacy; use `bundler` or `nodenext` | `node10` is deprecated and emits warnings |
| `baseUrl` | implicit lookup root | **deprecated** | Use `package.json` `imports` (`#/...`) or bundler aliases instead |
| `target` | `es5` was historical | the current-year ES version (`es2025` in 6.0); `es5` discouraged | UI runtimes are evergreen; `es5` blocks modern emit and bloats output |
| Legacy module formats | `amd`, `umd`, `systemjs`, `none`, `outFile`-era | effectively gone | UI bundlers don't use them |

TS 6.0 is the **bridge release** to the Go-native TS 7 compiler: flags removed in TS 6 are hard errors in 7. Per-flag semantics are in the compiler-options reference linked at the foot of this file.

## Required tsconfig for UI projects

Apps (Vite, Next.js, Remix, Astro):

```jsonc
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["es2023", "dom", "dom.iterable"],
    "jsx": "react-jsx",

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noFallthroughCasesInSwitch": true,

    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "noUncheckedSideEffectImports": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,

    "noEmit": true,
    "types": []
  },
  "include": ["src"]
}
```

Why each flag earns its place in a UI project:

| Flag | Why for UI |
|---|---|
| `target: es2022` | Class fields with proper `defineProperty` semantics; `at()`, top-level `await`. Minimum baseline for React 19 + modern bundlers |
| `moduleResolution: bundler` | Vite/Next/Rolldown/esbuild resolve via `package.json` `exports`; matches bundler reality |
| `jsx: react-jsx` | Automatic runtime: no manual `import React`, smaller bundle |
| `strict: true` | TS 6.0 default; explicit for clarity |
| `noUncheckedIndexedAccess` | `arr[0]`, `tuple[1]`, `record[key]` all become `T \| undefined`. Catches "first selected item" + "current row" UI bugs at compile time |
| `exactOptionalPropertyTypes` | `prop?: string` rejects `prop: undefined`. Forces components to express "absent" by omitting the key, which matches React's diff/render semantics |
| `useUnknownInCatchVariables` | `catch (e)` is `unknown`. UI fetch/parse code must narrow before reading `.message` |
| `noImplicitOverride` | Subclass methods need `override`. Catches stale lifecycle hooks in class components and renamed React parents |
| `noPropertyAccessFromIndexSignature` | `obj.foo` errors when `foo` came only from an index signature; catches typos in i18n dicts and feature-flag lookups |
| `noFallthroughCasesInSwitch` | UI state machines and reducer switches don't silently fall through |
| `isolatedModules` | Each file transpilable in isolation, as Vite/SWC/esbuild/tsdown require |
| `verbatimModuleSyntax` | `import type` stays `import type`; no import elision; required by Node strip-types and modern bundlers |
| `erasableSyntaxOnly` | Bans enum, namespace-with-values, parameter properties, `import =`/`export =`, all TS-only runtime syntax. Aligns with Node's default type stripping (unflagged since 22.18 / 23.6, stable since 24.12 / 25.2) |
| `noUncheckedSideEffectImports` | TS 6 default; `import "./theme.css"` errors if missing. Kills dead CSS imports |
| `skipLibCheck` | 30–60% faster typecheck; trade off `.d.ts` bug detection in deps for build speed |
| `noEmit: true` | Bundler emits JS; tsc only typechecks |
| `types: []` | TS 6 default; opt in explicitly to `node`, `vite/client`, `vitest/globals` |

Node UI tooling (Vite config, Storybook node side, build scripts):

```jsonc
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["es2023"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "scripts"]
}
```

Both blocks above are the complete config. Nothing is elided, so they can be copied as-is; the per-flag rationale table is directly above.

## Strictness ladder for existing projects

Adopt incrementally; each step is a separate PR with its own diagnostic wave.

| Step | Flag(s) to enable | What you'll fix |
|---|---|---|
| 1 | `strict: true` (covers `noImplicitAny`, `strictNullChecks`, `useUnknownInCatchVariables`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`) | Untyped function params, missing null checks, raw `catch (e)` reads. Largest wave |
| 2 | `noUncheckedIndexedAccess` | `arr[i]` and `record[key]` everywhere. Narrow with `if (item)` or `??` |
| 3 | `noImplicitOverride` + `noFallthroughCasesInSwitch` | Add `override` keywords; close switch case fall-throughs in reducers |
| 4 | `noPropertyAccessFromIndexSignature` | Convert dot access on dictionary types to bracket access |
| 5 | `exactOptionalPropertyTypes` | Stop passing `undefined` to optional props; either omit or widen the prop to `T \| undefined`. Largest UI-specific wave; React passes optional props by spreading |

Run each step with the typecheck gate (`node node_modules/ts7/bin/tsc --noEmit`) until clean before merging the next.

## TS 6 → 7 migration warnings

TS 6.0 emits deprecation warnings for behaviors that hard-fail in TS 7. Treat warnings as build-blocking now.

| Deprecated in 6, fails in 7 | Replacement |
|---|---|
| `moduleResolution: node` / `node10` | `nodenext` (libs/scripts) or `bundler` (apps) |
| `module: amd` / `umd` / `systemjs` / `none` | `esnext`, `nodenext`, or `preserve` |
| `target: es5` (and `downlevelIteration` to compensate) | `es2022` minimum |
| `baseUrl` as the alias mechanism | `package.json` `imports` (`#shared/*`) or bundler `paths` |
| Import assertions (`assert { type: "json" }`) | Import attributes (`with { type: "json" }`) |
| `moduleResolution: classic` | `bundler` or `nodenext` |
| `outFile` | A bundler (Vite, tsdown) |
| `alwaysStrict: false`, `esModuleInterop: false`, `allowSyntheticDefaultImports: false` | Leave at the TS 6 defaults (`true`) |
| `/// <reference no-default-lib="true"/>` | `noLib` or `lib` in tsconfig |
| Floating compiler defaults (`strict`, `module`, `target`, `types`, `rootDir` unset) | Always set these explicitly |
| Numeric `enum`, namespace-with-values, parameter properties, `import =`/`export =` | Forbidden under `erasableSyntaxOnly: true`; rewrite as union + `as const` object |

Each row above is a config edit, not a code migration, so the whole wave is usually one PR per project surface.

## The TypeScript 7 typecheck gate

TypeScript 7.0 went GA on 2026-07-08. The Go-native compiler now ships as **`typescript@7` itself**, whose only binary is `tsc`; the official side-by-side package `@typescript/typescript6` ships `tsc6` and re-exports the TypeScript 6 API. Microsoft's documented layout is `"@typescript/native": "npm:typescript@^7.0.2"` plus `"typescript": "npm:@typescript/typescript6@^6.0.2"`; the fleet's `ts7` alias plus `typescript@^6.0.3` is an equivalent arrangement, and either is acceptable in a reviewed project. Detect TypeScript 7 by version (`--version` prints `Version 7.`), never by alias name. The `@typescript/native-preview` package and its `tsgo` binary were the *preview* channel for that work; that channel was abandoned after `7.0.0-dev.20260707.2` (2026-07-07) and must never be installed. `tsgo` or `@typescript/native-preview` in a project is itself a finding: the project is pinned to a dev nightly of a dead channel.

Both compilers stay installed, because **TypeScript 7.0 ships no programmatic compiler API**. The official position is that 7.1 is expected to introduce a new and different one. Until then `typescript` 6.x remains the API provider for typescript-eslint, ts-jest, ts-morph, Stryker, custom transformers, and the editor's tsserver. Dual-compiler, not a swap.

The fleet contract installs both under distinct names:

```jsonc
// package.json
"devDependencies": {
  "ts7": "npm:typescript@~7.0.2",   // TS7 Go-native type gate. `~` = patch-only, on purpose
  "typescript": "^6.0.3"            // API provider: typescript-eslint, ts-jest, editors, emit
}
```

**Invoke both by explicit path, never by bare name.** Each package declares a `tsc` bin, and npm's link order on that collision is not guaranteed. Measured on a real repo, `node_modules/.bin/tsc` resolved to TS7 and TS6's `tsc` was never linked at all. A bare `tsc` or `npx tsc` therefore silently runs whichever compiler npm happened to link.

| The gate (TS7, by path) | The emit/tooling lane (TS6, by path, never the gate) |
|---|---|
| `node node_modules/ts7/bin/tsc --noEmit` on every PR, the CI typecheck gate | `.d.ts` declaration emit for published libraries (`node node_modules/typescript/bin/tsc -b`) |
| Per-surface checks during adoption (`node node_modules/ts7/bin/tsc --noEmit -p <tsconfig>`) | Anything on the TS6 compiler API: ts-morph, ts-jest, Stryker, custom transformers, codemods |
| Whole-monorepo type-check where TS6 cold-start dominates | Editor tsserver (still TS6-backed) |
| Strictness-ladder verification per step | JS/JSDoc-heavy checking (closure-style annotations are intentionally narrowed in the new JS checker) |

Two hazards when running the TS7 compiler:

- **It emits even while reporting a fatal config error.** A full `dist/` has been observed written alongside a `TS5108: moduleResolution=node10 has been removed` failure. Never infer success from the existence of build output. Check the exit code and read stderr.
- **Its declaration output differs from TS6's.** A `tsc -b` run with the wrong binary silently rewrites committed `dist/` type shapes.

Adoption on an existing project: promote per surface. Run the TS7 gate against each tsconfig; a surface that fails for TS7 capability reasons (verify by reading the errors, don't assume) stays on the TS6 check while the green set grows, and the TS6 gate is retired once every surface is green. The `ts7` alias disappears at TypeScript 7.1, when `typescript` itself moves to 7.x and the ecosystem's API consumers follow.

This section is the plugin's single source of truth for the compiler channel. Any guidance anywhere that still names `tsgo` or `@typescript/native-preview` as the way to run the Go-native compiler predates the 7.0 GA release and is wrong; the GA gate is `node node_modules/ts7/bin/tsc --noEmit`, invoked by path.

## Anti-patterns banned in UI code

| Anti-pattern | Replacement | Why |
|---|---|---|
| `enum Status { ... }` (numeric or string) | `const STATUS = { idle: "idle", ... } as const` + `type Status = typeof STATUS[keyof typeof STATUS]` | Enums emit runtime, break under `erasableSyntaxOnly`, poor JSON/URL/JSX interop |
| `namespace Foo { ... }` | ES module: separate file or barrel | Pre-ESM legacy; banned under `erasableSyntaxOnly` |
| `const Btn: React.FC<P> = ...` | `function Btn(props: P) { ... }` | `React.FC` blocks generics, hardcodes return type, historically added implicit `children`. `@types/react` 18 stripped implicit children but the pattern is still discouraged |
| `const x: any` or `(arg: any)` | `unknown` then narrow with type guard, `instanceof`, or schema parse | `any` poisons every downstream caller; `unknown` forces a check |
| `value as unknown as T` (double cast) | Real validation (Zod / valibot) at the boundary; `satisfies T` if you're proving shape | Double cast is a confessed lie, and a review-blocker |
| `barrel/index.ts` re-exporting an entire feature | Direct imports `import { Button } from "@/ui/button"` | Barrels block tree-shaking, balloon TS program memory in monorepos, slow incremental builds |
| `// @ts-ignore` | `// @ts-expect-error <issue link or short reason>` | `@ts-expect-error` self-deletes when the underlying error is fixed; `@ts-ignore` rots forever |
| `Function`, `Object`, `{}` as types | Specific signatures; `Record<string, unknown>`; `unknown` | All three accept far more than the writer intended |
| `arr[0].name` after `noUncheckedIndexedAccess` | `arr[0]?.name`, or `const first = arr[0]; if (!first) return null;` | TS 6 typing makes `arr[0]` `T \| undefined`; ignoring it crashes the render |
| `prop: undefined` passed to `prop?: T` under `exactOptionalPropertyTypes` | Omit the key, or widen the prop to `prop?: T \| undefined` | Optional-prop spec means "absent", not "explicitly undefined" |
| Class component with new code | Function component + hooks | Class lifecycle is legacy; React 19 ships ref-as-prop, action hooks, server components, none of which target classes |
| `useRef<HTMLInputElement>()` (zero-arg) | `useRef<HTMLInputElement>(null)` | React 19 + `@types/react@^19` removed the zero-arg form |

Component-typing anti-patterns get their full treatment in `references/typescript/02-component-typing.md`; state-shape anti-patterns in `03-state-typing.md`.

## Verifying the config

Three commands every UI engineer should know:

| Command | Purpose |
|---|---|
| `node node_modules/ts7/bin/tsc --noEmit` | Typecheck without writing files. The canonical CI gate |
| `node node_modules/ts7/bin/tsc --showConfig` | Print the **resolved** config after `extends` merging. Use first when a flag "isn't taking" |
| `node node_modules/typescript/bin/tsc --traceResolution 2>&1 \| head -50` | Show how each `import` resolved, in order. Use when a `paths`/`exports`/`bundler` resolution surprises you |

Other diagnostics worth knowing:

| Command | Purpose |
|---|---|
| `node node_modules/typescript/bin/tsc --listFiles` | Every file pulled into the program (catches accidental `node_modules` inclusion) |
| `node node_modules/typescript/bin/tsc --extendedDiagnostics` | Type-check timings + memory; find slow `@types/*` |
| `node node_modules/typescript/bin/tsc --generateTrace ./trace` | Chromium-trace-format profile (open with `chrome://tracing`) |
| `node node_modules/typescript/bin/tsc --noEmit` | TS6 check, only for surfaces not yet TS7-green, or emit-lane verification |

CI script. Every entry names its compiler by path, so no script can inherit the wrong `tsc`:

```jsonc
// package.json
{
  "scripts": {
    "typecheck": "node node_modules/ts7/bin/tsc --noEmit",
    "typecheck:ts6": "node node_modules/typescript/bin/tsc --noEmit",
    "typecheck:trace": "node node_modules/typescript/bin/tsc --noEmit --extendedDiagnostics"
  }
}
```

Reach for `--extendedDiagnostics` before `--generateTrace`: the timings alone identify a slow `@types/*` package most of the time, and the trace is only worth opening when they do not.

## Cross-references

| File | Covers |
|---|---|
| `references/typescript/02-component-typing.md` | Function components, polymorphic `as` prop, compound components, slots, render props, refs in React 19, CVA variants, banned HOC patterns |
| `references/typescript/03-state-typing.md` | Discriminated unions for async/form/modal state, reducer typing, URL vs server vs client state split, Zod at the boundary |
| `references/typescript/04-branded-primitives.md` | Brand pattern (intersection / unique symbol / Tagged), smart constructors, UI primitive brand catalogue, Zod brand parsing |
| `references/architecture/01-component-patterns.md` | Component-internal structure: pattern selection matrix, compound components, slot, polymorphic, headless hook, render props, CVA, public API stability, common smells. It does **not** cover project layout, monorepo project references, barrel-file rules, or bundler wiring |

Coverage gap, stated plainly so no reviewer assumes otherwise: the plugin ships no reference
for project layout, monorepo project references, publishing, or Vite/Next/tsdown build
wiring. The tsconfig blocks above are the whole of what this plugin says about build
configuration. When a review needs more, read the project's own config and verify the
toolchain's current API with `context7`, and say in the finding that the plugin has no
reference for it.

## Sources (canonical)

| Topic | URL |
|---|---|
| Compiler options reference (every flag above) | https://www.typescriptlang.org/tsconfig/ |
| Release notes index | https://www.typescriptlang.org/docs/handbook/release-notes/overview.html |
| TypeScript release announcements | https://devblogs.microsoft.com/typescript/ |
| The Go-native compiler (TypeScript 7) | https://github.com/microsoft/typescript-go |
| TypeScript with React | https://react.dev/learn/typescript |
| Node type stripping (`erasableSyntaxOnly` alignment) | https://nodejs.org/api/typescript.html |
