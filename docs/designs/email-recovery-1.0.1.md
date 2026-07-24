# 1.0.1 — Email recovery for phone-based accounts

> Original prompt: users can change phone numbers and lose access to their
> phone-only account. Add email as a recovery anchor. Support elders who
> aren't comfortable with email by letting them use the pastor's/admin's email.

## Problem

Identity = phone number (OTP login, no password). If a member changes or loses
their number, they can't log in with a new one — it's treated as a new account,
and their prayer history / cell / role are stranded on the old account.

## Why not "admin re-links the phone"

Rejected. If an in-app admin can set a member's login phone, they can point it at
a number they control and OTP in **as that member** — account takeover. Admins
must never be able to change a member's login identity. (Today the admin edit
screen only changes role + cell — no phone field. Keep it that way.)

## Security reasoning (the guardrails)

Principle: **whoever changes the login identity must prove control of both the
existing account and the new contact.**

1. **Logged-in change-phone** — user (already authenticated) enters a new number,
   OTP verifies it, `updateUser({ phone })` moves the *same* account. Safe: the
   user drives it, consent is implicit. But does NOT cover full lockout.

2. **Full lockout** (phone gone AND no active session) — recovery must be
   triggerable from the **logged-out** screen. This *requires* a durable,
   user-reachable channel → email. This is why email is necessary; the
   logged-in flow alone can't solve it.

3. **Pastor's-email option** — routing a member's recovery to the pastor's inbox
   means the pastor can complete a logged-out recovery and thus **access that
   account**. Acceptable ONLY as an explicit, disclosed opt-in ("Recovery will go
   to Pastor Kim, who will be able to access this account"), never a default.
   Church context softens it (the pastor already sees prayers in the admin view),
   but account *control* ≠ pastoral *visibility* — so it must be a chosen risk.

## Scope

1. **Join flow:** email required. Field to type your own, OR choose the
   pastor's/admin's email — the latter shows the disclosure line above.
2. **Login screen:** "Can't access your phone?" → email OTP → regain access →
   set a new phone number.
3. **Profile:** view / change recovery email (while logged in).
4. **Backend:** store recovery email on the user record; Supabase supports email
   OTP natively, so it reuses the existing OTP model. Store a flag when the email
   is a delegate (pastor/admin) so the disclosure is auditable.

## Explicitly out of scope

- Admin-editable login phone (takeover risk — never).
- Silent (non-disclosed) delegate emails.

## Ship order

v1 launches phone-only. This is 1.0.1, built after v1 is approved.
