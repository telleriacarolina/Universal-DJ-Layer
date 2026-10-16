# The-Chatroom Host Integration Blueprint

This document shows how **The-Chatroom** can use the **Universal DJ Control Layer** as a headless runtime policy/control plane.

## 1) High-level architecture

```text
┌───────────────────────────────────────────────────────────────────┐
│                             Clients                               │
│                     Web / Mobile / Desktop                        │
└───────────────────────────────┬───────────────────────────────────┘
                                │ HTTPS / WS
┌───────────────────────────────▼───────────────────────────────────┐
│                         The-Chatroom App                          │
│  API/Realtime Gateway • Rooms • Messages • Presence • Reactions   │
│  Moderation Service (base rules) • Notifications                  │
└───────────────────────────────┬───────────────────────────────────┘
                                │ evaluate("message.pre_publish", ctx)
┌───────────────────────────────▼───────────────────────────────────┐
│                  Universal DJ Control Layer (Headless)            │
│  Disc Registry • Ordered Evaluator • Conflict Rules               │
│  RBAC/Ownership Guard • Targeting/Experiments • Kill Switches     │
│  Audit + Observability ("who changed what, when, why")            │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                     ┌──────────▼──────────┐
                     │ Policy + Audit Data │
                     └─────────────────────┘
```

## 2) Control layer role in a host app

The host app (The-Chatroom) owns business entities and UX.  
The Universal DJ Control Layer owns runtime behavior control:

- Safe, reversible policy changes without redeploying chat core
- Role-scoped runtime tuning by admins/moderators/operators
- Controlled experiments and progressive rollout
- Auditable decisions for governance and incident response

## 3) Example chat discs

- **Safety/Moderation**: profanity filter, spam throttle, link risk checks, room safety mode
- **Role tuning**: stricter policies for new users, moderator/admin overrides, trust-score-based limits
- **Feature experiments**: composer assist variants, notification policy experiments, threading heuristics
- **Ops controls**: feature kill switch, temporary read-only mode, degraded-mode routing

## 4) Message pre-publish integration flow

1. User sends message in The-Chatroom.
2. Chat service builds policy context and calls:
   - `evaluate("message.pre_publish", context)`
3. DJ Layer executes matching enabled discs in priority order.
4. DJ Layer returns final decision:
   - allow, block, redact, throttle, label, or route
5. The-Chatroom enforces the decision before message persistence/broadcast.
6. Decision + reasons + policy IDs are written to audit/metrics.

## 5) Phase 1 production plan

Goal: first production-ready integration on one hook (`message.pre_publish`).

- **Scope**
  - Disc registry + ordered evaluator
  - Deterministic conflict handling (deny wins by default)
  - 3 starter discs:
    - `FeatureKillSwitchDisc`
    - `ProfanityFilterDisc`
    - `SpamThrottleDisc`
  - Audit logging per evaluation
  - Room/global enablement config

- **Success criteria**
  - Enable/disable discs by scope (room/global)
  - Instant rollback/kill switch behavior
  - Traceable decision logs with request ID and reason codes
  - Added latency remains within host SLO budget

## 6) Minimum evaluation API contract

```ts
export type DiscHook =
  | "message.pre_publish"
  | "message.post_publish"
  | "user.join_room"
  | "reaction.add"
  | "notification.dispatch";

export interface DiscContext {
  hook: DiscHook;
  roomId: string;
  userId: string;
  roles: string[];
  payload: Record<string, unknown>;
  metadata: {
    timestamp: string;
    requestId: string;
    appVersion?: string;
  };
}

export type DiscAction =
  | { type: "redact"; fields: string[] }
  | { type: "label"; value: string }
  | { type: "throttle"; seconds: number }
  | { type: "route"; queue: string };

export interface DiscDecision {
  allow: boolean;
  actions?: DiscAction[];
  reasons: string[];
  policyIds: string[];
}
```

## 7) Exact TypeScript interface file set (Phase 1 target)

### Universal-DJ-Layer

- `src/core/types.ts`
  - `DiscHook`, `DiscContext`, `DiscAction`, `DiscDecision`
- `src/core/Disc.ts`
  - `Disc` interface (`id`, `version`, `priority`, `supports`, `evaluate`)
- `src/core/DiscRegistry.ts`
  - disc registration and hook filtering
- `src/core/DiscEngine.ts`
  - ordered evaluation and decision merging
- `src/runtime/PolicyStore.ts`
  - room/global enablement lookup
- `src/runtime/AuditLogger.ts`
  - evaluation decision audit logging

### The-Chatroom (host app)

- `src/integrations/dj/types.ts`
- `src/integrations/dj/ChatroomDjClient.ts`
- `src/integrations/dj/DjHookContextFactory.ts`
- `src/integrations/dj/DjDecisionMapper.ts`
- `src/services/chat/MessageService.ts` (hook call path)

## 8) Sample DiscEngine implementation (reference)

```ts
export class DiscEngine {
  constructor(
    private readonly registry: DiscRegistry,
    private readonly audit: { logDecision: (ctx: DiscContext, d: DiscDecision) => Promise<void> }
  ) {}

  async evaluate(hook: DiscHook, ctx: DiscContext): Promise<DiscDecision> {
    const discs = this.registry
      .getByHook(hook)
      .sort((a, b) => a.priority - b.priority);

    const finalDecision: DiscDecision = {
      allow: true,
      actions: [],
      reasons: [],
      policyIds: []
    };

    for (const disc of discs) {
      const decision = await disc.evaluate(ctx);
      if (!decision) continue;

      finalDecision.actions!.push(...(decision.actions ?? []));
      finalDecision.reasons.push(...decision.reasons);
      finalDecision.policyIds.push(...decision.policyIds);

      if (!decision.allow) {
        finalDecision.allow = false;
        break; // short-circuit on deny
      }
    }

    await this.audit.logDecision(ctx, finalDecision);
    return finalDecision;
  }
}
```

## 9) Realistic first PR description + acceptance criteria

### Suggested PR title

`Add The-Chatroom host integration blueprint and Phase 1 runtime policy contract`

### PR description (suggested)

This change adds a concrete host-application integration blueprint showing how The-Chatroom can use the Universal DJ Control Layer as a runtime policy/control plane. It introduces:

- A high-level architecture diagram for The-Chatroom + DJ Layer
- A message pre-publish policy evaluation flow
- Phase 1 implementation plan and scope
- Starter disc examples for moderation, role-based tuning, experiments, and operations
- Minimum API contract for policy evaluation prior to publish
- A reference interface file map and sample `DiscEngine` sketch

### Acceptance criteria

- [ ] New documentation is available under `docs/` and linked from existing docs
- [ ] Architecture clearly separates host app responsibilities vs control-plane responsibilities
- [ ] Message pre-publish flow is documented with deterministic decision handling
- [ ] Phase 1 scope and success criteria are explicit and implementation-ready
- [ ] Minimum API contract includes `DiscHook`, `DiscContext`, `DiscAction`, and `DiscDecision`
- [ ] No runtime behavior changes were introduced in library code
