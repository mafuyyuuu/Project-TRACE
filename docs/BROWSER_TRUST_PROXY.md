# First-party personal-browser authentication

The deployed frontend and API use unrelated origins. Safari/Brave can block the API's
third-party cookies, including `trace_mfa_trust`, despite credentialed CORS. A saved frontend
preference alone never authorizes skipping OTP. See [WebKit's cookie policy](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/).

Root `vercel.json` now proxies `/api/auth/:path*` to
`https://trace-plp-api.duckdns.org/api/auth/:path*` before the SPA fallback, using native
[Vercel external rewrites](https://vercel.com/docs/routing/rewrites#rewrites-to-external-origins).
The browser stays on the TRACE origin. Host-only Set-Cookie responses therefore belong to
TRACE, and the browser returns them on later `/api/auth` requests.

The Vercel build command enables `VITE_AUTH_PROXY=true`. The shared Axios interceptor
selects relative `/api` only for `/auth` requests; the existing `VITE_API_URL` still serves
other REST traffic and Socket.IO. Upload/forecast paths keep their existing transport and
limits. Local Vite/Nginx behavior stays as configured unless the flag is explicitly enabled.

Passwords, required first verification, explicit consent, HttpOnly/Secure/SameSite settings,
account/version binding, revocation and midnight Manila expiry are unchanged. Auth responses
use `Cache-Control: private, no-store`. Proofs are never placed in JavaScript storage or
JSON. The nonsecret browser preference is still separate from the HttpOnly proof.

## Deployment and acceptance

1. Pull the matching dev commit and rebuild/recreate the backend; deploy the frontend from
   the repository root so Vercel uses its root config and build command. If the project
   overrides Build Command, include `VITE_AUTH_PROXY=true` before `npm run build`. If the
   API hostname changes, update the rewrite destination along with `VITE_API_URL`.
2. Retain the existing HTTPS `VITE_API_URL` for other API calls and Socket.IO, the exact
   frontend CORS allowlist, and the existing trusted-browser/authenticator tables. This
   patch adds no migration, dependency or backend secret. Do not widen `TRUST_PROXY` from
   one to two or trust arbitrary forwarded headers: the API remains directly reachable.
   With Caddy's existing sanitization, proxied auth traffic is conservatively IP-limited
   and logged by the Vercel edge address seen by Caddy; multiple visitors may share that
   bucket. Original visitor IP handling would require an authenticated proxy chain.
3. Open the deployed TRACE URL in Brave/Safari with normal privacy protections. Complete
   a fresh OTP/app verification with **This is my personal browser — trust it for today**
   checked. A cookie saved on the older API domain cannot migrate to the frontend host.
4. In browser developer tools, confirm the auth request targets the TRACE origin and the
   response sets host-only `trace_mfa_trust`, HttpOnly, Secure and Path `/api/auth`, expiring
   at midnight Manila. Never copy cookie values into reports or messages.
5. Ordinary logout, then correct-password login on the same browser/URL before midnight
   should reuse the proof and skip OTP. Wrong password, shared mode, expired/cleared proof,
   account revocation and missing trust storage must still require/reject verification.
   Privacy modes that discard all site storage can still require OTP.

The local synthetic test exercised the real LoginPage and controller/auth/trust services
through a Vite same-origin proxy, with in-memory model replacements and no real records or
email: one OTP challenge, two password sign-ins, and a returned HttpOnly cookie on the second
sign-in. This verifies the local transport and application flow; it does not certify a live
Vercel deployment or physical Brave/Safari acceptance.

The Vercel CLI is absent locally. Installing `npm i -g vercel` is strongly recommended for
`vercel env pull`, `vercel deploy` and `vercel logs`; installation was not performed here.
