# Community verification & gated pastor role

**Status:** design only — not implemented. Deliberately deferred.

## Original request

> new feature: I(developer) would need to be able to verify a community. So the plan is
> to make a community verifiable. When a user creates a community, no more pastor role is
> assigned but only admin role. Only verified communities have the pastor role. We can
> allow an admin to submit a request to verify. We can add this in a todo feature folder
> with its design and do it later.

## Problem

Today anyone who creates a community is granted `['pastor', 'admin', 'member']` by
`create_and_claim_church()`. `pastor` is the app's highest church-level role — it can
delete the community outright, read every prayer request including pastor-only ones, and
is exempt from the last-admin guard.

That means a stranger who signs up and taps "Create a community" self-assigns pastoral
authority. For an app where members share sensitive personal prayer requests specifically
*because* a pastor will see them, self-claimed pastor status undermines the core trust
assumption.

## Proposed model

Communities get a verification state. `pastor` becomes a role that only exists inside a
verified community.

| State | Meaning | Roles available |
|---|---|---|
| `unverified` | Default on creation | `admin`, `cell_leader`, `member` |
| `pending` | Admin submitted a request, awaiting developer review | unchanged |
| `verified` | Developer approved | `pastor` becomes grantable |
| `rejected` | Developer declined, with a reason | unchanged |

### Creation change

`create_and_claim_church()` assigns `['admin', 'member']` — dropping `pastor`.

### Verification request

An admin submits a request with supporting detail (church name, website, address, their
role, contact). Stored in a new `verification_requests` table. One open request per
community.

### Developer review

The `/dev` dashboard gains a queue: pending requests with the submitted detail plus
community stats already available (member count, cell count, age, activity). Approve sets
`verified`, reject stores a reason shown back to the admin.

### Granting pastor after verification

On approval, the requesting admin is granted `pastor`. After that, existing admins can
grant `pastor` to others — but only within a verified community.

## Schema sketch

```sql
alter table churches
  add column verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','rejected')),
  add column verified_at timestamptz,
  add column verified_by uuid references users(id);

create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  submitted_by uuid not null references users(id),
  contact_name text not null,
  contact_role text not null,
  church_website text,
  church_address text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);
create unique index on verification_requests (church_id) where status = 'pending';
```

### Guard

`pastor` needs the same treatment the `developer` role got — a trigger rejecting the
grant unless the target's community is `verified`. Without it, the RLS policy
`admins can update church members` (which permits arbitrary `roles` arrays within a
church) lets any admin grant themselves `pastor` and bypass verification entirely.

```sql
-- reject if 'pastor' is being added and the user's church isn't verified
```

## Open questions

1. **Existing communities.** VKPC is real and its pastor role is legitimate — it should
   be grandfathered to `verified` in the migration. VKPC TEST can stay unverified as a
   test of the unverified path.
2. **What can an unverified community do?** Proposal: everything except hold a `pastor`.
   Blocking more (e.g. hiding from search) would punish legitimate churches during review.
3. **Pastor-only prayer requests in an unverified community.** With no pastor, "Pastor
   only" would be visible to nobody but the author and admins. Either hide the option
   until verified, or relabel it per-community. Needs deciding before shipping — it's a
   real interaction with the feature shipped on 2026-09-12.
4. **Who verifies, at scale?** Currently one developer. Manual review doesn't scale past
   a few dozen communities; revisit if growth demands it.
5. **Does `destroy_church` stay pastor-gated?** It currently allows pastor OR sole admin.
   With no pastor in unverified communities, a multi-admin unverified community would
   have nobody able to delete it.

## Why deferred

VKPC is live with real members and this changes the role model underneath them. Worth
doing carefully and separately rather than bundled into a UI batch.
