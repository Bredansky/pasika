# Configuration Rule

Configuration describes how the application runs, not behavior that belongs to a component or feature. This rule keeps those values together in one app-wide location.

- Configuration values — hardcoded application data, environment parsing, and third-party service settings — MUST live in `src/config/` regardless of consumers.
- Configuration values MUST NOT be duplicated in `constants/`.

## Incorrect — Configuration Stored as a Constant

```ts
// src/constants/stripe.ts
export const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
```

Why: an environment setting is application configuration, not a general constant.

## Correct — Environment Setting in `src/config/`

```ts
// src/config/stripe.ts
export const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
```

Why: application configuration has one predictable location.
