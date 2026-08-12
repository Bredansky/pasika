# Repeated Structure Rule

A flat structure duplicated across multiple files turns every change into a multi-site edit that silently drifts out of sync and undermines maintainability. This rule fixes extraction on the repeated-structure trigger.

- A block of elements MUST be extracted as a named component when the same flat structure appears in two or more places.

## Incorrect — Repeated Structure Kept Inline

```tsx
// src/features/dashboard/dashboard-view.tsx
export function DashboardView({ stats, activity }: DashboardViewProps): React.JSX.Element {
  return (
    <main>
      <section className="border-3d bg-card w-full p-6">
        <h2>Stats</h2>
        <ul>
          {stats.map((stat) => (
            <li key={stat.id}>
              {stat.label}: {stat.value}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-3d bg-card w-full p-6">
        <h2>Recent Activity</h2>
        <ul>
          {activity.map((event) => (
            <li key={event.id}>{event.text}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

Why: the `<section>` wrapper plus its `<h2>` + `<ul>` shape appears verbatim in two sibling regions of the same parent. A styling tweak to that wrapper requires editing both call sites and silently breaks if one is missed.

## Correct — Repeated Structure Extracted

```text
src/features/dashboard/
  dashboard-view/
    index.ts                  # re-exports only dashboard-view.tsx
    dashboard-view.tsx
    panel.tsx                 # exclusive child — imported directly
```

```tsx
// src/features/dashboard/dashboard-view/panel.tsx
import { ReactNode } from "react";

export function Panel({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="border-3d bg-card w-full p-6">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

```tsx
// src/features/dashboard/dashboard-view/dashboard-view.tsx
import { Panel } from "./panel";

export function DashboardView({ stats, activity }: DashboardViewProps): React.JSX.Element {
  return (
    <main>
      <Panel title="Stats">
        <ul>
          {stats.map((stat) => (
            <li key={stat.id}>
              {stat.label}: {stat.value}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Recent Activity">
        <ul>
          {activity.map((event) => (
            <li key={event.id}>{event.text}</li>
          ))}
        </ul>
      </Panel>
    </main>
  );
}
```

Why: the wrapper, the title slot, and the children slot are owned by `<Panel>` now. Each region collapses to a one-line component call, and a styling tweak to the wrapper touches one file and both regions follow. Both call sites live in `dashboard-view.tsx`, which is `Panel`'s only consumer, so `DashboardView` becomes a folder holding `panel.tsx` as its exclusive child.
