---
topic: typescript
role: reference
scope: branded-primitives
audience: ui-engineer
---

# Branded Primitives for UI

TypeScript is structurally typed: `string` is `string`, regardless of whether it's a user ID, an order ID, or an HSL color. Branded types add a compile-time-only nominal tag so the compiler can reject `setMargin(userId)` and `transferFunds(toId, fromId, amount)`.

Baseline: TS 6.0 strict (`references/typescript/01-ts6-essentials.md`). Brand types are erased at compile time, so runtime cost is zero.

## Why branded primitives in UI

Real bugs caught by branding, real bugs missed without it:

| Without brands (compiles, breaks at runtime) | With brands (compile error) |
|---|---|
| `setMargin(userId)` where `setMargin(px: number)` and `userId: string` | Different types, so already caught |
| `setMargin(orderTotal)` where both are `number` | Caught only if `Pixels` and `USDCents` are branded |
| `transferFunds(toAccountId, fromAccountId, 100)` where args swapped | Caught only if `AccountId` is branded **and** the function signature is `(from: AccountId, to: AccountId, ...)`. Argument-order bugs then become impossible to express |
| `<div style={{ background: userInput }}>` where `userInput` could be unsafe | Caught only if `style.background` requires `HexColor \| OklchColor \| ... ` rather than `string` |
| `setTimeout(cb, retryAfterSeconds * 1000)` where someone forgot the `* 1000` | Caught only if `setTimeout` expects `Milliseconds` not `number` |
| `<img src={dataUriString} />` where `dataUriString` is actually `RawHtml` | Caught only if `Url` and `RawHtml` are distinct brands |
| Mixing `Pixels`, `Rem`, and raw `number` in a layout calc | Brand each unit, then explicit converters |

Real example from the wild: a checkout flow that reads `discountPercent` (0–100) and applies it as `total * discountPercent`, expecting `discountPercent` to be `0..1`. Brand `Percent01` and `Percent100` and the bug doesn't compile.

The general name for the failure these prevent is primitive obsession: modelling a domain value as the primitive that happens to carry it, so the compiler can no longer tell two of them apart.

## The Brand pattern

Three encodings, all zero-runtime-cost. Pick one per project and use it everywhere.

### A. Intersection with `__brand` literal (most common)

```ts
type Brand<K, T extends string> = K & { readonly __brand: T };

type UserId    = Brand<string, "UserId">;
type ProductId = Brand<string, "ProductId">;
type Email     = Brand<string, "Email">;

const u: UserId = "u_1" as UserId;
const p: ProductId = "p_1" as ProductId;
declare function getUser(id: UserId): Promise<User>;
getUser(p);                          // error: Argument of type 'ProductId' not assignable to 'UserId'
```

### B. `unique symbol` brand (collision-proof across modules)

```ts
declare const UserIdBrand: unique symbol;
declare const OrderIdBrand: unique symbol;

type UserId  = string & { readonly [UserIdBrand]:  never };
type OrderId = string & { readonly [OrderIdBrand]: never };
```

Use when brands cross module boundaries in a public API. Two `Brand<string, "UserId">` declarations in different modules are structurally identical, but two `unique symbol`-keyed brands are not.

### C. `type-fest` `Tagged<Base, Tag>` (third-party helper)

```ts
import type { Tagged } from "type-fest";

type UserId = Tagged<string, "UserId">;
type Email  = Tagged<string, "Email">;
```

Same shape as encoding A but the helper documents intent. Recommended for projects already on `type-fest`.

All three compile to nothing: the brand is a phantom type, present in the type system and absent from the emitted JavaScript.

## Smart constructors with validation

A brand without a constructor is just an opaque rename. A brand with a validating constructor is a runtime guarantee that any `Pixels` is non-negative, any `Email` matches the regex, any `Oklch` is in range.

```ts
type Brand<K, T extends string> = K & { readonly __brand: T };

// Pixels: non-negative integer
type Pixels = Brand<number, "Pixels">;
function Pixels(n: number): Pixels {
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new RangeError(`Pixels must be a non-negative integer, got ${n}`);
  }
  return n as Pixels;
}

// HexColor: #RGB | #RRGGBB | #RRGGBBAA
type HexColor = Brand<string, "HexColor">;
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function HexColor(s: string): HexColor {
  if (!HEX.test(s)) throw new TypeError(`Invalid hex color: ${s}`);
  return s as HexColor;
}

// OklchColor: oklch(L C H) with L in [0,1], C >= 0, H in [0,360)
type OklchColor = Brand<string, "OklchColor">;
function OklchColor(L: number, C: number, H: number, alpha = 1): OklchColor {
  if (L < 0 || L > 1)        throw new RangeError(`L must be in [0,1], got ${L}`);
  if (C < 0)                 throw new RangeError(`C must be >= 0, got ${C}`);
  if (H < 0 || H >= 360)     throw new RangeError(`H must be in [0,360), got ${H}`);
  if (alpha < 0 || alpha > 1) throw new RangeError(`alpha must be in [0,1], got ${alpha}`);
  const a = alpha === 1 ? "" : ` / ${alpha}`;
  return `oklch(${L} ${C} ${H}${a})` as OklchColor;
}

// Use sites
const m: Pixels = Pixels(16);
const c: HexColor = HexColor("#1d4ed8");
const o: OklchColor = OklchColor(0.7, 0.15, 250);

// What the type system rejects
function setMargin(px: Pixels) { /* ... */ }
setMargin(16);                  // error: number is not Pixels
setMargin(Pixels(16));          // ok
setMargin(Pixels(-3));          // throws at runtime
```

For brands without runtime validation (pure tags), use a passthrough:

```ts
type AccountId = Brand<string, "AccountId">;
const AccountId = (s: string): AccountId => s as AccountId;
```

The same split exists in effect-ts: `Brand.refined<T>(predicate, errorFactory)` for validated brands, `Brand.nominal<T>()` for passthrough ones.

## UI primitive brand catalogue

Recommended starting set. Adopt incrementally: each brand is a separate mini-PR (declare type + constructor + replace use sites).

| Brand | Underlying | Validation | Where it appears |
|---|---|---|---|
| `UserId` | `string` | UUID or app-format | Auth, profile, mention components |
| `ProductId` | `string` | UUID or `prod_*` prefix | Catalog, cart, checkout |
| `OrderId` | `string` | UUID or `ord_*` prefix | Orders list, order detail, refunds |
| `OrgId` / `TenantId` | `string` | UUID or slug | Multi-tenant UI guards |
| `Email` | `string` | RFC5322-lite regex | Sign-up, share, mention |
| `Url` | `string` | `new URL(s)` succeeds | `<a href>`, `<img src>`, OAuth redirects |
| `HexColor` | `string` | `#rgb` / `#rrggbb` / `#rrggbbaa` | Legacy theme tokens, swatch picker |
| `OklchColor` | `string` | `oklch(L C H)` bounds | 2026 design-token primary; see `references/design/01-color-oklch.md` |
| `Hsl` | `string` | `hsl(H S% L%)` | Mid-migration palettes |
| `Pixels` | `number` | non-negative integer | `width`/`height`/`margin`/`padding` |
| `Rem` | `number` | non-negative finite | Spacing/typography scale |
| `Em` | `number` | non-negative finite | Component-relative spacing |
| `Percentage` | `number` | `0..100` (or `0..1`; pick one, and brand both as different types if you need both) | Progress bars, opacity, discount displays |
| `Milliseconds` | `number` | non-negative integer | `setTimeout`, animation `duration`, debounce |
| `Seconds` | `number` | non-negative finite | API `retry-after`, video timestamps |
| `AnimationFrame` | `number` | non-negative integer | `requestAnimationFrame` IDs |
| `ZIndex` | `number` | integer | Layer ordering. Branding prevents `zIndex={"high"}` and forces use of design-system tokens |
| `IsoDateString` | `string` | parses via `Date` and `.toISOString()` round-trips | API payload dates |
| `SafeHtml` | `string` | passed through DOMPurify or trusted source | `dangerouslySetInnerHTML` |
| `RawHtml` | `string` | none, explicitly untrusted | Forces sanitization step before reaching `SafeHtml` sink |
| `Slug` | `string` | `/^[a-z0-9-]+$/` | URL paths, file names |

Pair `RawHtml`/`SafeHtml` with a sink that only accepts `SafeHtml`:

```tsx
type RawHtml  = Brand<string, "RawHtml">;
type SafeHtml = Brand<string, "SafeHtml">;
import DOMPurify from "isomorphic-dompurify";

function sanitize(raw: RawHtml): SafeHtml { return DOMPurify.sanitize(raw) as SafeHtml; }

function RichText({ html }: { html: SafeHtml }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// Use site -- compiler enforces sanitization
const fromApi = bodyJson.markdown as RawHtml;
<RichText html={sanitize(fromApi)} />;
<RichText html={fromApi} />;          // error: RawHtml not assignable to SafeHtml
```

This is the same trick OWASP recommends for SQL safety with branded `SqlFragment`.

## Brands at the network boundary

Zod can produce branded values directly from a schema, collapsing validation + nominal typing into one step.

```ts
import { z } from "zod";

const UserId = z.uuid().brand<"UserId">();
type UserId = z.infer<typeof UserId>;                 // string & z.BRAND<"UserId">

const Email = z.email().brand<"Email">();
type Email = z.infer<typeof Email>;

const OklchColor = z.string()
  .regex(/^oklch\(/)
  .brand<"OklchColor">();
type OklchColor = z.infer<typeof OklchColor>;

const UserSchema = z.object({
  id: UserId,
  email: Email,
  preferredHue: OklchColor.optional(),
});
type User = z.infer<typeof UserSchema>;
//   ^? { id: UserId; email: Email; preferredHue?: OklchColor }

const data: unknown = await (await fetch("/api/me")).json();
const me: User = UserSchema.parse(data);
//                ^? UserId, Email, OklchColor are all branded -- safe to flow into UI
```

This is where brands pay back the most: validate once at the API edge, and the types flow branded through every component, hook, and reducer downstream. A single parse also buys a runtime benefit that has nothing to do with types (see `references/performance/07-runtime-engine-patterns.md`): every parsed object gets one fixed shape, which keeps property access in a row renderer monomorphic. Zod version baseline for this plugin is 4.x, where the string format validators are top-level (`z.uuid()`, `z.email()`), not chained methods.

valibot equivalent (`v.brand`, `v.parse`) ships smaller bundles and is a drop-in for projects on the valibot stack.

## Destructuring back to base type

Branded types are `Base & { __brand: T }`, assignable **to** `Base` (TS widens via the intersection projection in most contexts), but not from. When you need the raw primitive for an HTML attribute or a third-party API, two safe paths:

```ts
const id: UserId = UserId("u_42");

// 1. Implicit: UserId is a string subtype, passes through to string-typed sinks
<input data-user-id={id} />;          // ok -- DOM attr accepts string

// 2. Explicit unbrand for clarity (still a one-direction cast)
function unbrand<B extends string | number, T extends string>(
  v: B & { readonly __brand: T },
): B {
  return v as B;
}
const raw: string = unbrand(id);

// 3. If you wrote your own helper:
function asString<T extends string>(b: Brand<string, T>): string { return b; }
```

Direction matters: `UserId → string` is safe (every `UserId` is a `string`); `string → UserId` requires the constructor (`UserId(s)`) so the validation runs.

Pitfall: `JSON.stringify(branded)` returns the underlying primitive; `JSON.parse` returns `unknown` and **the brand is lost**. Re-validate on the way back in (Zod schema does both at once).

## Pitfalls

| Pitfall | Cause | Fix |
|---|---|---|
| Brand "collision" between modules | Two `Brand<string, "Id">` declarations across the codebase are structurally identical | Use `unique symbol`-keyed brand (encoding B above) for any brand that crosses a published API boundary |
| Brand lost across `JSON.parse` round-trip | Brands are erased; runtime values are plain primitives | Re-parse with the schema on every boundary crossing. Never trust an `as Brand` after deserialization |
| Brand lost when stored in `localStorage` / URL params | Same: primitive on both sides | Re-validate on read; treat `localStorage.getItem` as `unknown` |
| Library wants `string`, you have `UserId` | Most libraries accept primitives | Pass the brand directly. TS treats the intersection as assignable to `string` |
| Library wants `UserId`, you have `string` | The library can't have branded types in its signature unless your project owns it | Brand at your edges only; library signatures stay primitive. The brand exists in your domain code |
| `type Brand<K, T>` reused across team with same `T` literal in different files | Structural equivalence makes them the same type | Centralize brand declarations in a single `brands.ts` file; everyone imports |
| `as` cast everywhere instead of constructor | The brand is preserved but validation is skipped | Lint rule: ban `as <BrandName>` in source files; only allow inside the constructor file |
| Brand at every layer | Constructors run on every render | Brand once at the boundary (API parse, URL parse, env load); flow downstream as the branded type |
| Two brands with the same string tag | `Brand<string, "Id">` defined in two places means they're the same type | Use distinct tags (`"UserId"` vs `"OrderId"`) or `unique symbol` |
| Trying to brand a `readonly`/`const` literal | `as const satisfies T` then brand later | Apply the brand on the final value, not the literal-typed source |

Every row above has the same root cause: the brand is a compile-time fiction, so any path where the value leaves and re-enters the type system (serialization, storage, a third-party call) drops it silently.

## Cross-references

| File | Covers |
|---|---|
| `references/typescript/01-ts6-essentials.md` | The strict-mode flags that make brand violations visible (without `strict`, mismatched primitives just widen) |
| `references/typescript/02-component-typing.md` | Component prop patterns where brands appear (`Box`, `Button`, polymorphic `as`) |
| `references/typescript/03-state-typing.md` | Discriminated-union state and reducer actions where branded IDs flow through `payload`/`target` fields |
| `references/design/01-color-oklch.md` | `OklchColor` brand specifically: the 2026 design-token primary, the rationale for OKLCH over HSL/Hex, and the project's color-token catalogue |

## Sources (canonical)

| Topic | URL |
|---|---|
| Zod (4.x API, `.brand()`) | https://zod.dev |
| valibot | https://valibot.dev |
| effect-ts branded types | https://effect.website/docs/code-style/branded-types/ |
| type-fest `Tagged` | https://github.com/sindresorhus/type-fest |
| DOMPurify | https://github.com/cure53/DOMPurify |
| Compiler options reference | https://www.typescriptlang.org/tsconfig/ |
