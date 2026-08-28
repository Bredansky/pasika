import { describe, ruleTester, srcFile } from "../rule-tester";
import { repeatedStructureRule } from "./repeated-structure";

const componentFile = srcFile("features/dashboard/dashboard-view.tsx");

void describe("A block of elements MUST be extracted as a named component when two or more places use the same arrangement of elements for the same purpose. Different data or labels do not prevent extraction.", () => {
  ruleTester.run("repeated-structure", repeatedStructureRule, {
    valid: [
      // A single block is not repeated.
      {
        code: `
          export function View() {
            return (
              <main>
                <section className="w-full rounded border p-6">
                  <h2>Stats</h2>
                  <ul>
                    {stats.map((stat) => (
                      <li key={stat.id}>{stat.label}: {stat.value}</li>
                    ))}
                  </ul>
                </section>
              </main>
            );
          }
        `,
        filename: componentFile,
      },
      // Two blocks with different arrangements: heading layout differs.
      {
        code: `
          export function View() {
            return (
              <main>
                <section className="w-full rounded border p-6">
                  <h2>Stats</h2>
                  <ul>
                    {stats.map((stat) => (
                      <li key={stat.id}>{stat.label}: {stat.value}</li>
                    ))}
                  </ul>
                </section>
                <div className="w-full rounded border p-6">
                  <h2>Activity</h2>
                  <p>{activity.length} events</p>
                </div>
              </main>
            );
          }
        `,
        filename: componentFile,
      },
      // Two blocks that share a tag but differ in structure (one has a list, the other not).
      {
        code: `
          export function View() {
            return (
              <main>
                <section className="w-full rounded border p-6">
                  <h2>Stats</h2>
                  <ul>
                    {stats.map((stat) => (
                      <li key={stat.id}>{stat.label}: {stat.value}</li>
                    ))}
                  </ul>
                </section>
                <section className="w-full rounded border p-6">
                  <h2>Activity</h2>
                  <p>{activity.length} events</p>
                </section>
              </main>
            );
          }
        `,
        filename: componentFile,
      },
      // Too small to read as a repeated block (fewer than four elements).
      {
        code: `
          export function View() {
            return (
              <main>
                <div><h2>Stats</h2></div>
                <div><h2>Activity</h2></div>
              </main>
            );
          }
        `,
        filename: componentFile,
      },
    ],
    invalid: [
      // The doc's example: identical section/heading/list arrangement, different data.
      {
        code: `
          export function View() {
            return (
              <main>
                <section className="w-full rounded border p-6">
                  <h2>{locales.dashboard.stats}</h2>
                  <ul>
                    {stats.map((stat) => (
                      <li key={stat.id}>{stat.label}: {stat.value}</li>
                    ))}
                  </ul>
                </section>
                <section className="w-full rounded border p-6">
                  <h2>{locales.dashboard.recentActivity}</h2>
                  <ul>
                    {activity.map((event) => (
                      <li key={event.id}>{event.label}: {event.value}</li>
                    ))}
                  </ul>
                </section>
              </main>
            );
          }
        `,
        filename: componentFile,
        errors: [
          {
            message:
              "The same arrangement of elements appears 2 times here; extract it as a named component. " +
              "Different data or labels do not prevent extraction. " +
              "See docs/code-organization-guide/rules/repeated-structure-rule.md",
          },
        ],
      },
      // Three repeated cards, differing only in text content.
      {
        code: `
          export function View() {
            return (
              <main>
                <article className="rounded border p-4">
                  <h3>Apple</h3>
                  <p>A crisp fruit.</p>
                </article>
                <article className="rounded border p-4">
                  <h3>Banana</h3>
                  <p>A yellow fruit.</p>
                </article>
                <article className="rounded border p-4">
                  <h3>Cherry</h3>
                  <p>A small fruit.</p>
                </article>
              </main>
            );
          }
        `,
        filename: componentFile,
        errors: [
          {
            message:
              "The same arrangement of elements appears 3 times here; extract it as a named component. " +
              "Different data or labels do not prevent extraction. " +
              "See docs/code-organization-guide/rules/repeated-structure-rule.md",
          },
        ],
      },
    ],
  });
});
