# Repeated Structure Rule

Repeated markup can drift when one copy changes and another does not. This rule makes repeated structure a clear extraction trigger.

- A block of elements MUST be extracted as a named component when two or more places use the same arrangement of elements for the same purpose. Different data or labels do not prevent extraction.

## Incorrect — Repeated Structure Kept Inline

```tsx
// src/features/dashboard/dashboard-view.tsx
import { locales } from "@/locales";

export function DashboardView({ stats, activity }: DashboardViewProps): React.JSX.Element {
  return (
    <main>
      <section className="w-full rounded border p-6">
        <h2>{locales.dashboard.stats}</h2>
        <ul>
          {stats.map((stat) => (
            <li key={stat.id}>
              {stat.label}: {stat.value}
            </li>
          ))}
        </ul>
      </section>

      <section className="w-full rounded border p-6">
        <h2>{locales.dashboard.recentActivity}</h2>
        <ul>
          {activity.map((event) => (
            <li key={event.id}>
              {event.label}: {event.value}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

Why: the same section, heading, and list structure appears in two places. Changing the shared frame requires editing both copies.

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
type PanelItem = {
  id: string;
  label: string;
  value: string | number;
};

export function Panel({ title, items }: { title: string; items: PanelItem[] }): React.JSX.Element {
  return (
    <section className="w-full rounded border p-6">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.label}: {item.value}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// src/features/dashboard/dashboard-view/dashboard-view.tsx
import { Panel } from "./panel";
import { locales } from "@/locales";

export function DashboardView({ stats, activity }: DashboardViewProps): React.JSX.Element {
  return (
    <main>
      <Panel title={locales.dashboard.stats} items={stats} />
      <Panel title={locales.dashboard.recentActivity} items={activity} />
    </main>
  );
}
```

Why: `Panel` owns the shared section, heading, and list structure, while each call site supplies only its title and items.
