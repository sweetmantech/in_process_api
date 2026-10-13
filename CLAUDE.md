# In-Process API

Backend API for a blockchain-based creative platform managing digital moments (NFTs), collections, and artist profiles.

**Note:** This is an API-only codebase. No client-side code (React hooks, browser APIs, `fetch('/api/...')` calls).

## Tech Stack

- **Framework:** Next.js 16 (App Router, API-only)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Blockchain:** Viem, Zora Protocol, Base chain
- **Auth:** Privy (tokens), API keys
- **Payments:** Coinbase CDP SDK, 0xSplits
- **Media:** Mux (video), Arweave (decentralized storage)
- **Validation:** Zod v4
- **Package Manager:** pnpm

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm format       # Format with Prettier
pnpm format:check # Check formatting
```

## Project Structure

```
src/
├── app/api/           # API route handlers
│   ├── artists/       # Artist profile endpoints
│   ├── collections/   # NFT collection management
│   ├── moment/        # Moment (NFT) endpoints
│   ├── smartwallet/   # Wallet operations
│   ├── payments/      # Payment processing
│   └── ...
├── lib/               # Utilities and services
│   ├── supabase/      # Database operations by table
│   ├── protocolSdk/   # Zora Protocol wrapper
│   ├── privy/         # Auth utilities
│   ├── mux/           # Video processing
│   ├── arweave/       # Decentralized storage
│   └── ...
├── types/             # TypeScript definitions
├── authMiddleware.ts  # Auth middleware
└── errors.ts          # Error definitions
```

## Key Patterns

### Authentication

Two methods supported via `authMiddleware`:

1. **Bearer token** - `Authorization: Bearer <token>` (Privy auth)
2. **API key** - `x-api-key: <key>` header

Both return an `artistAddress` for the authenticated user.

### API Routes

- All routes use `export const dynamic = 'force-dynamic'`
- Zod v4 schemas for input validation (use `.superRefine()` for custom validation)
- Standard error responses with status codes

#### Code Organization (SRP)

Follow the Single Responsibility Principle:

- **One function per file** - Each utility function should be in its own file with a default export
- **Thin route files** - Route handlers should only call validators and handlers
- Separate validation and business logic into `@/lib/<domain>/` files

#### KISS: Decide context values as close to the core function as possible

When a wrapper function always operates in a fixed context (e.g., `createMomentFromMedia` is always SMS, `createMomentFromTelegramAttachment` is always Telegram), hardcode that context value directly at the mint call site (e.g. `createMomentBatch` with `channel: 'telegram'`) — do **not** thread it as a parameter up the call stack. Adding a parameter only makes sense when the caller genuinely controls the value.

#### Server-internal context via a separate `ctx` parameter

When a value **is** caller-varying per request but is **not** something a public API client would ever send (e.g., the Telegram `chat_id` derived inside a webhook), do not add it to the public Zod schema. Instead, pass it through a dedicated optional `ctx` object alongside the validated input:

```typescript
// Public input stays clean — zod schema is unchanged
// Pass server-only fields alongside validated input (not in the schema), e.g.:
async function handler(
  input: CreateMomentContractInput,
  ctx?: { chatId?: string }
) {
  // ...
}

// Telegram webhook path populates ctx
await handler(input, { chatId: thread.channelId });

// Web / API / SMS paths simply omit ctx → chatId is undefined
await handler(input);
```

Rationale:

- The public `createMomentSchema` must not imply that clients can target arbitrary chats.
- `ctx` is a single extension point for future server-internal metadata (trace IDs, admin overrides, etc.).
- Callers that don't need it are unchanged — no `undefined` scatter in call sites.

#### Schema Organization

- **All Zod schemas live in `@/lib/schema/`** — never define schemas inline in route files or handler files
- Use `addressSchema` (`@/lib/schema/addressSchema.ts`) for Ethereum address fields — it validates the hex format and normalizes to lowercase via `getAddress`
- Use the shared `validate()` helper (`@/lib/schema/validate.ts`) for body validation; use `.safeParse()` directly for query param validation in routes
- **Avoid double-validation**: validate at the route layer (raw strings → typed values), then pass typed values to handlers without re-validating

#### Error Propagation

- Always destructure `{ data, error }` from Supabase calls — never ignore `error`
- If `error` is truthy, throw or return a 500 immediately so DB failures are not silently treated as empty results
- Return 400 for missing/invalid params, 403 for authorization failures, 500 for unexpected errors

#### Authorization

- For endpoints that expose private data (e.g. emails), guard with: caller is admin (`ADMIN_ADDRESSES.includes(callerAddress.toLowerCase())`) OR caller is the subject (`callerAddress.toLowerCase() === artistAddress.toLowerCase()`)
- Normalize addresses to lowercase before all comparisons

#### Route Handler Pattern

Each route method follows a strict three-layer split:

1. **`@/lib/<domain>/validate<Action><Type>.ts`** — takes `NextRequest`, runs auth + schema validation, returns validated data or `NextResponse`
2. **`@/lib/<domain>/<action>Handler.ts`** — takes typed validated inputs, contains all business logic
3. **`@/app/api/<route>/route.ts`** — thin, only calls validate → handler → catch

```typescript
// @/lib/emails/validateEmailsQuery.ts - Validation helper
const validateEmailsQuery = async (req: NextRequest) => {
  const authResult = await authMiddleware(req);
  if (authResult instanceof Response) return authResult as NextResponse;
  const result = validate(emailQuerySchema, Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!result.success) return result.response;
  return { callerAddress: authResult.artistAddress, ...result.data };
};

// @/lib/emails/getEmailsHandler.ts - Business logic handler
const getEmailsHandler = async (callerAddress: string, ...) => {
  // ... business logic
  return NextResponse.json({ ... });
};

// @/app/api/emails/route.ts - Thin route file
export async function GET(req: NextRequest) {
  try {
    const validated = await validateEmailsQuery(req);
    if (validated instanceof NextResponse) return validated;
    const { callerAddress, artist_address, cursor, limit } = validated;
    return getEmailsHandler(callerAddress, artist_address, cursor, limit);
  } catch (e: any) {
    return Response.json({ message: e?.message ?? 'Failed' }, { status: 500 });
  }
}
```

- For **body validation** (POST/DELETE), use the shared `validate()` helper from `@/lib/schema/validate.ts`
- For **query param validation** (GET), use `.safeParse()` directly (params are always strings, may need coercion)
- Auth middleware (`authMiddleware`) belongs in the validator, not the handler or route

### Telnyx Types

Use `InboundMessagePayload` from `telnyx/resources/shared`:

```typescript
import type { InboundMessagePayload } from 'telnyx/resources/shared';
type Media = NonNullable<InboundMessagePayload['media']>[number];
```

### Telegram success messaging

Telegram mint flows (`processSingleMedia`, `createMomentsFromGroup`, `createMomentFromYoutubeLink`) notify the user via `replyAfterSuccess` (per token). Group albums mint multiple tokens in one chain operation using `createMomentsFromGroup` → `createMomentBatch`, then call `replyAfterSuccess` once per `tokenId`.

### Database

Supabase tables prefixed with `in_process_`:

- `artists`, `moments`, `collections`
- `payments`, `sales`, `notifications`
- `comments`, `api_keys`, `phone_numbers`

`in_process_wallets.type`:

- `privy` / `farcaster` / `external` / `null` — a person's EOA
- `payment` — the artist's payment smart account (`getArtistSmartAccount(artistId)`, one per artist). Holds funds: topup, collect, withdraw, Arweave
- `operator` — the smart account derived from an EOA (`getWalletSmartAccount(eoa)`). Holds collection permissions. `eoa` links it to its source EOA, and a trigger keeps its `artist` in sync with that EOA
- Use `isSmartWalletType` to exclude `payment` and `operator` when picking an EOA

#### lib/supabase Functions

Functions in `@/lib/supabase/` are **pure Supabase operations only** — no formatting, transformation, or business logic. They execute a query and return the raw Supabase result (`{ data, error }`). All data shaping belongs in the caller.

```typescript
// CORRECT - pure query, return raw result
const getArtistAddresses = async (socialWallets: string[]) => {
  return supabase
    .from('in_process_artist_social_wallets')
    .select('social_wallet, artist_address, in_process_artists(username)')
    .in('social_wallet', socialWallets);
};

// WRONG - formatting/mapping inside a supabase function
const getArtistAddresses = async (socialWallets: string[]) => {
  const { data } = await supabase...;
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.social_wallet] = row.artist_address; // ← not here
  return map;
};
```

#### Supabase Migrations

- **Never copy from old migration files** — always read the **most recent** migration for a given function before writing a new one. Schema changes (renames, new columns) are applied in later migrations and won't appear in older files.
- **Never edit existing migration files** — Supabase tracks migrations by filename and will not re-run a modified file. Always create a new migration file with a later timestamp.
- **Before writing any migration that touches a table or function**, read the latest migration file that affects it to confirm current column names, types, and function signatures.

#### Supabase Egress Optimization

- **Select only needed fields** - Use `.select('field1, field2')` instead of `.select('*')` to reduce data transfer
- **Limit entries** - Use `.limit()`, `.range()`, or pagination to avoid fetching unnecessary rows
- **Optimize client code** - Reduce the number of queries by batching or caching where possible
- **Minimal returns on mutations** - For `.insert()` and `.update()`, omit `.select()` if the returned row data is not needed
- **Exclude unneeded tables from backups** - When running manual backups through Supavisor, remove unneeded tables and reduce backup frequency

#### Transfers Query Performance (Large Tables)

When `in_process_transfers` reaches high row counts (e.g., 1M+), follow this order:

1. Run `EXPLAIN (ANALYZE, BUFFERS)` on the exact SQL shape used by the endpoint.
2. Add indexes for join/filter/sort paths first (including trigram for `%...%` MIME search).
3. Prefer cursor pagination (`transferred_at + id`) over offset pagination.
4. Avoid expensive exact counts on hot paths:
   - Use `count: 'planned'` / `count: 'estimated'`, or
   - Split exact count into a separate endpoint.
5. Consider denormalized/materialized read models for heavy multi-join listing routes.
6. Treat statement timeout increases as a last resort only.

Current transfer-specific guidance:

- `content_type` filter targets MIME (`metadata.content->>'mime'`), not `type`.
- For case-insensitive substring search, use `lower(... ) LIKE '%audio%'` and align index expression accordingly.
- `CREATE INDEX CONCURRENTLY` must be executed one statement at a time (not inside a transaction block).

### Blockchain

- **Mainnet:** Base (chain ID 8453)
- **Testnet:** Base Sepolia (chain ID 84532)
- Toggle via `IS_TESTNET` env var

### Catalog Protocol (CR1155)

Custom ERC-1155 protocol by Catalog Records. Separate contract architecture from Zora.

**Contract source:** `contracts/catalog/`

**ABI:** `@/lib/abi/cr1155Abi.ts`

**Key contracts:**

- `CR1155Implementation` — ERC-1155 token contract (UUPS upgradeable)
- `ICRMintController` / `USDCFixedPriceController` — minting/sale logic
- `PermissionController` — permission management at token and contract level
- `CRDelegator` — EIP-712 signature-based delegated transactions

**Permission scopes (bit flags):**

| Constant             | Value    | Description    |
| -------------------- | -------- | -------------- |
| `AUTH_SCOPE_OWNER`   | `1 << 0` | Contract owner |
| `AUTH_SCOPE_ARTIST`  | `1 << 1` | Artist         |
| `AUTH_SCOPE_MANAGER` | `1 << 2` | Manager        |

Permissions are tracked at two levels: **contract-wide** (`contractPermissions[address]`) and **per-token** (`tokenPermissions[tokenId][address]`).

**Key functions:**

```solidity
// Purchase a token (USDC payment)
purchaseTokenWithValue(address _to, uint256 _tokenid, uint256 _amount, uint256 _value, address _ref0, address _ref1)

// Update token metadata URI
// Requires: token-level OWNER|ARTIST, or contract-level OWNER|ARTIST|MANAGER
updateTokenURI(uint256 _tokenId, string calldata _uri)

// Admin mint (free, artist/owner only)
mintTokenAdmin(address _to, uint256 _tokenId, uint256 _amount, bytes calldata _data)
```

**Signature-based overloads:** Every write function has a `(bytes _data, bytes _signature, address _signer)` overload for platform-sponsored execution via `CRDelegator`.

**`updateTokenURI` permission note:** The caller (smart wallet address) must hold `ARTIST` or `OWNER` scope on the token or contract. If the smart wallet was not granted permission at token creation time, the call reverts with `NonPermitted`.

**Mint controller address:** `CATALOG_MINT_CONTROLLER` in `@/lib/consts.ts`

**Payment currency:** USDC (`USDC_ADDRESS[CHAIN_ID]`)

## Indexer / Envio Integration

### Envio GraphQL Entity Names

Use exact snake_case entity names when writing `queryFragment` strings:

| Entity                | GraphQL name            |
| --------------------- | ----------------------- |
| InProcess collections | `InProcess_Collections` |
| InProcess moments     | `InProcess_Moments`     |
| InProcess admins      | `InProcess_Admins`      |
| InProcess comments    | `InProcess_Comments`    |
| InProcess airdrops    | `InProcess_Airdrops`    |
| Payments              | `Payments`              |
| Primary sales         | `Primary_Sales`         |
| Collectors            | `Collectors`            |
| Catalog collections   | `Catalog_Collections`   |
| Catalog moments       | `Catalog_Moments`       |
| Catalog admins        | `Catalog_Admins`        |
| Sound editions        | `Sound_Editions`        |
| Sound moments         | `Sound_Moments`         |
| Sound admins          | `Sound_Admins`          |

**Note:** BigInt fields (`max_supply`, `token_id`, `sale_start`, `sale_end`, `price_per_token`, `amount`) are returned as **strings** from GraphQL — always convert with `Number()` or `parseInt()` before storing.

### Timestamp Field Mapping (Envio → Supabase)

Envio and Supabase use different column names for some timestamp values. This is intentional.

| Entity         | Envio field      | Supabase field   | Note                           |
| -------------- | ---------------- | ---------------- | ------------------------------ |
| Admins         | `updated_at`     | `granted_at`     | Only entity where names differ |
| Airdrops       | `updated_at`     | `updated_at`     | direct                         |
| Collections    | `updated_at`     | `updated_at`     | direct                         |
| Collectors     | `collected_at`   | `collected_at`   | direct                         |
| Comments       | `commented_at`   | `commented_at`   | direct                         |
| Moments        | `updated_at`     | `updated_at`     | direct                         |
| Payments       | `transferred_at` | `transferred_at` | direct                         |
| Primary Sales  | `created_at`     | `created_at`     | direct                         |
| Sound Editions | `updated_at`     | `updated_at`     | direct                         |
| Sound Moments  | `updated_at`     | `updated_at`     | direct                         |
| Sound Admins   | `updated_at`     | `updated_at`     | direct                         |

Incremental indexing flow per entity:

1. `selectMaxTimestampFn()` reads max timestamp from **Supabase** (e.g., `granted_at` for admins)
2. `msToBlockTs()` converts it back to chain timestamp (seconds)
3. `queryFragment` filters **Envio** using the corresponding field (e.g., `updated_at` for admins)

### Sound_Moments → token_id Mapping

`Sound_Moments.tier` maps to `in_process_moments.token_id` as **`tier + 1`**.

`token_id = 0` is reserved for the edition level, so tiers are 1-indexed in Supabase:

| Envio `tier` | Supabase `token_id` |
| ------------ | ------------------- |
| 0            | 1                   |
| 1            | 2                   |
| N            | N + 1               |

This applies in both `mapMomentsToSupabase` and any real-time emit that fires after indexing.

### Real-time Event Notifications

The previous standalone indexer (`in-process-token-indexer`) used **Socket.IO** to broadcast events to connected clients whenever data was indexed. It ran as a persistent Node.js process, so a shared `Server` instance could be kept in memory.

**Events emitted (reference):**

| Event                      | Payload                                   | Trigger                             |
| -------------------------- | ----------------------------------------- | ----------------------------------- |
| `moment:updated`           | `{ collectionAddress, tokenId, chainId }` | After each moment is indexed        |
| `collection:updated`       | `{ collectionAddress, chainId }`          | After each collection is indexed    |
| `moment:admin:updated`     | `{ collectionAddress, tokenId, chainId }` | After token-level admin change      |
| `collection:admin:updated` | `{ collectionAddress, chainId }`          | After collection-level admin change |
| `moments:count-updated`    | _(no payload)_                            | After any moment batch is indexed   |

**Why Socket.IO doesn't work here:** Vercel Functions are stateless and ephemeral — a persistent `Server` instance cannot be shared across invocations.

**How to add real-time notifications in this project:**

Option 1 — **Pusher / Ably (recommended):** Call their HTTP API from within `processBatchFn` after each successful upsert. No persistent connection needed. Drop-in replacement — same event names and payloads as above.

```typescript
// Example after upsertMoments():
await pusher.trigger('indexer', 'moment:updated', {
  collectionAddress: moment.collection,
  tokenId: Number(moment.token_id),
  chainId: moment.chain_id,
});
```

Option 2 — **Server-Sent Events (SSE):** Add a `GET /api/events` route that streams `text/event-stream`. Clients subscribe and receive pushes. Works on Vercel with Edge Runtime; limited to one-way server→client flow (suitable for our use case).

Option 3 — **Polling:** Clients poll `GET /api/moment` or similar endpoints. Simplest approach; no infra change required. Acceptable when sub-second latency is not needed.

The indexer already calls `processBatchFn` for every entity batch — the right place to add any notification side-effect is immediately after the Supabase upsert inside each `process*InBatches` function.

## Path Aliases

- `@/*` → `./src/*`
