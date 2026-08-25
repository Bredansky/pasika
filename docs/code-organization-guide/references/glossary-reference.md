# Glossary Reference

Use this reference to look up the terms this guide's workflows and rules use. Terms are grouped by the decision they support.

## Structure Terms

These terms name the parts of the `src/` tree and the way an item's location is derived from its consumers.

| Term                        | Definition                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Layer                       | One of the five scopes an item can belong to: `app`, `compositions`, `features`, `shared`, or `root`.           |
| Feature                     | One folder under `src/features/` holding the components and support files of a single product capability.      |
| Composition                 | A component that imports from two or more feature folders.                                                    |
| Support file                | A hook, type, schema, constant, or pure function that supports other code rather than rendering UI.            |
| Support folder              | A folder named `hooks/`, `types/`, `schemas/`, `constants/`, or `utils/` that holds support files of that kind. |
| Closest common folder (CCF) | The closest folder under `src/` shared by every file that uses an item.                                        |
| Configuration module        | An app-wide module under `src/config/<config-name>/` that selects or parameterizes application behavior.        |
| Barrel                      | An `index.ts` whose only content is re-exports of other modules.                                              |

## Component Terms

These terms name the component classifications and the extraction triggers this guide's workflows use.

| Term                         | Definition                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smart component              | A component that fetches data, or that defines `handle*` callbacks and passes them to children as `on*` props.                                                                                            |
| Dumb component               | A component that neither fetches data nor defines `handle*` callbacks for children.                                                                                                                     |
| Exclusive child component    | A component imported only by its parent component.                                                                                                                                                      |
| Nested component             | A component that lives in a folder carrying its own name, together with its exclusive children and their support files.                                                                                   |
| Interactive element          | An HTML element the HTML specification lists as [interactive content](https://html.spec.whatwg.org/multipage/dom.html#interactive-content).                                                               |
| Imperative category          | One of four kinds of imperative work a hook can contain — subscriptions, external I/O and persistence, DOM manipulation, or resource lifecycle — where each operation counts toward exactly one of them.   |
| Subscriptions                | Event listeners and registration or cleanup APIs such as `on()` and `off()`.                                                                                                                            |
| External I/O and persistence | Network requests, asynchronous reads or writes, and browser storage.                                                                                                                                    |
| DOM manipulation             | Imperative DOM APIs such as `focus()`, `classList`, observers, or imperative rendering.                                                                                                                  |
| Resource lifecycle           | Setup and teardown APIs such as `load()`, `destroy()`, or `dispose()`.                                                                                                                                  |
