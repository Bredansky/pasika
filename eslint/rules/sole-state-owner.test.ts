import { describe, ruleTester, srcFile } from "../rule-tester";
import { soleStateOwnerRule } from "./sole-state-owner";

const componentFile = srcFile("compositions/dashboard-view.tsx");

void describe("A component MUST extract a named component when one part of its JSX contains every JSX expression, callback, and effect that reads one state hook's value or calls its updater.", () => {
  ruleTester.run("sole-state-owner", soleStateOwnerRule, {
    valid: [
      // State read across discontiguous parts of the JSX — no single run owns it.
      {
        code: `
            export function Dashboard() {
              const [open, setOpen] = useState(false);
              return (
                <div>
                  <button onClick={() => setOpen(true)}>Open</button>
                  {open && <p>panel</p>}
                  <section>{open ? "on" : "off"}</section>
                </div>
              );
            }
          `,
        filename: componentFile,
      },
      // State read by every top-level child — no part is the sole owner.
      {
        code: `
            export function Counter() {
              const [count, setCount] = useState(0);
              return (
                <div>
                  <h1>{count}</h1>
                  <button onClick={() => setCount(count + 1)}>inc</button>
                </div>
              );
            }
          `,
        filename: componentFile,
      },
      // State only used in the shell (all top-level children use it) — fine.
      {
        code: `
            export function Profile() {
              const [name] = useState("ada");
              return <section data-testid="Profile">{name}</section>;
            }
          `,
        filename: componentFile,
      },
      // No useState at all.
      {
        code: `
            export function Static() {
              return <div><h1>Hello</h1></div>;
            }
          `,
        filename: componentFile,
      },
      // State used outside JSX (an effect) — not solely JSX-confined.
      {
        code: `
            export function WithEffect() {
              const [id, setId] = useState("");
              useEffect(() => { setId("x"); }, []);
              return (
                <div>
                  {id && <p>{id}</p>}
                  <h1>Title</h1>
                </div>
              );
            }
          `,
        filename: componentFile,
      },
      // A derived value is also consumed by an effect; it does not belong only to JSX.
      {
        code: `
            export function SharedDerivedState() {
              const [filter, setFilter] = useState("all");
              const filtered = filter === "all" ? products : products.filter((product) => product.category === filter);
              useEffect(() => { report(filtered.length); }, [filtered]);
              return (
                <main>
                  <header>Merch</header>
                  <button onClick={() => setFilter("clothing")}>Clothing</button>
                  <section>{filtered.length}</section>
                  <footer>Shipping</footer>
                </main>
              );
            }
          `,
        filename: componentFile,
      },
      // Unknown computations may have side effects and must not be moved implicitly.
      {
        code: `
            export function ImpureDerivedState() {
              const [filter, setFilter] = useState("all");
              const filtered = fetchProducts(filter);
              return (
                <main>
                  <header>Merch</header>
                  <button onClick={() => setFilter("clothing")}>Clothing</button>
                  <section>{filtered.length}</section>
                  <footer>Shipping</footer>
                </main>
              );
            }
          `,
        filename: componentFile,
      },
      // Unrelated real content between users of one state is not an extractable group.
      {
        code: `
            export function NonContiguousCatalog() {
              const [filter, setFilter] = useState("all");
              const filtered = filter === "all" ? products : products.filter((product) => product.category === filter);
              return (
                <main>
                  <header>Merch</header>
                  <button onClick={() => setFilter("clothing")}>Clothing</button>
                  <Article />
                  <section>{filtered.length}</section>
                  <footer>Shipping</footer>
                </main>
              );
            }
          `,
        filename: componentFile,
      },
    ],
    invalid: [
      // Reproduces Karaylo's merch page: one state, derived list, decorative divider, nested JSX.
      {
        code: `
            export function MerchPage() {
              const [filter, setFilter] = useState("all");
              const filtered = filter === "all" ? products : products.filter((product) => product.category === filter);
              return (
                <>
                  <MarqueeBanner />
                  <main>
                    <header>Merch</header>
                    <RetroBox>Free shipping</RetroBox>
                    <div>{categories.map((category) => (
                      <button key={category} onClick={() => setFilter(category)}>
                        {filter === category ? "selected" : category}
                      </button>
                    ))}</div>
                    <AsciiDivider />
                    <section>
                      <h2>{filtered.length}</h2>
                      {filtered.map((product) => <MerchProductCard key={product.id} product={product} />)}
                    </section>
                    <Footer />
                  </main>
                </>
              );
            }
          `,
        filename: componentFile,
        errors: [
          {
            message:
              'Component "MerchPage" uses state "filter" in 3 contiguous top-level JSX parts; ' +
              "extract that part into a named component that owns useState instead of reading it in the parent. " +
              "See docs/next-codebase-guide/rules/sole-state-owner-rule.md",
          },
        ],
      },
      // Safe transitive aliases should also lead to the same extracted owner.
      {
        code: `
            export function Catalog() {
              const [filter, setFilter] = useState("all");
              const filtered = filter === "all" ? products : products.filter((product) => product.category === filter);
              const count = filtered.length;
              return (
                <main>
                  <Header />
                  <button onClick={() => setFilter("clothing")}>Clothing</button>
                  <section>{count}</section>
                  <Footer />
                </main>
              );
            }
          `,
        filename: componentFile,
        errors: [
          {
            message:
              'Component "Catalog" uses state "filter" in 2 contiguous top-level JSX parts; ' +
              "extract that part into a named component that owns useState instead of reading it in the parent. " +
              "See docs/next-codebase-guide/rules/sole-state-owner-rule.md",
          },
        ],
      },

      // The doc's example: button + modal are the sole owners, <h1> and content aren't.
      {
        code: `
            export function DashboardView() {
              const [isHelpOpen, setIsHelpOpen] = useState(false);
              return (
                <div>
                  <h1>Dashboard</h1>
                  <button onClick={() => setIsHelpOpen(true)} type="button">Help</button>
                  {isHelpOpen && <Modal onClose={() => setIsHelpOpen(false)}><HelpContent /></Modal>}
                  <DashboardContent />
                </div>
              );
            }
          `,
        filename: componentFile,
        errors: [
          {
            message:
              'Component "DashboardView" uses state "isHelpOpen" in 2 contiguous top-level JSX parts; ' +
              "extract that part into a named component that owns useState instead of reading it in the parent. " +
              "See docs/next-codebase-guide/rules/sole-state-owner-rule.md",
          },
        ],
      },
    ],
  });
});
