# Glossary Reference

Use this reference to look up the terms this guide's workflows and rules use. Terms are grouped by the decision they support.

## Shared Terms

These terms name the parts of the `src/` tree and the way an item's location is derived from its consumers, and every workflow below places items with them.

| Term                        | Definition                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Layer                       | One of the five scopes an item can belong to: `app`, `compositions`, `features`, `shared`, or `root`.           |
| Feature                     | One folder under `src/features/` holding the components and support files of a single product capability.       |
| Composition                 | A component that imports from two or more feature folders.                                                      |
| Support file                | A hook, type, schema, constant, or pure function that supports other code rather than rendering UI.             |
| Support folder              | A folder named `hooks/`, `types/`, `schemas/`, `constants/`, or `utils/` that holds support files of that kind. |
| Closest common folder (CCF) | The closest folder under `src/` shared by every file that uses an item.                                         |
| Configuration module        | An app-wide module under `src/config/<config-name>/` that selects or parameterizes application behavior.        |
| Barrel                      | An `index.ts` whose only content is re-exports of other modules.                                                |

## Component Terms

These terms name the component classifications and the extraction triggers this guide's workflows use.

| Term                         | Definition                                                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smart component              | A component that fetches data, or that defines `handle*` callbacks and passes them to children as `on*` props.                                                                                                                                        |
| Dumb component               | A component that neither fetches data nor defines `handle*` callbacks for children.                                                                                                                                                                   |
| Exclusive child component    | A component imported only by its parent component.                                                                                                                                                                                                    |
| Nested component             | A component that lives in a folder carrying its own name, together with its exclusive children and their support files.                                                                                                                               |
| Interactive element          | An HTML element the HTML specification lists as [interactive content](https://html.spec.whatwg.org/multipage/dom.html#interactive-content).                                                                                                           |
| Imperative category          | One of five things that each add one point to a hook's extraction score, no matter how many times it happens: calling two or more distinct built-in hooks, subscribing, doing external I/O, manipulating the DOM, or managing a resource's lifecycle. |
| Subscriptions                | Event listeners and registration or cleanup APIs such as `on()`, `off()`, `addEventListener()`, or `removeEventListener()`.                                                                                                                           |
| External I/O and persistence | An `await`ed expression, a `fetch()` call, or a call on `localStorage`, `sessionStorage`, or `indexedDB`.                                                                                                                                             |
| DOM manipulation             | Imperative DOM APIs such as `focus()`, `blur()`, `scrollIntoView()`, `click()`, `classList`, or constructing a `MutationObserver`, `ResizeObserver`, or `IntersectionObserver`.                                                                       |
| Resource lifecycle           | Setup and teardown APIs such as `load()`, `destroy()`, `dispose()`, `close()`, `cleanup()`, or `unmount()`.                                                                                                                                           |
| Extraction score             | A count a rule computes from its own signals to decide whether code needs to be extracted; reaching two triggers extraction.                                                                                                                          |

## Route Terms

These terms name the parts of a route's error handling and the way a failure becomes a response.

| Term             | Definition                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline         | A route handler together with its `withResponse` wrapper and every function the handler's awaited calls reach.                                                 |
| `withResponse`   | The wrapper that awaits a route handler's `{ message, data }` result and turns either that result or a thrown `HttpError` into a `{ data, message }` response. |
| `HttpError`      | The error type a failed call throws, carrying the status and message the route responds with; a module that needs a failure with its own name subclasses it.   |
| Delegated module | A module outside `route.ts` that a handler's awaited calls reach and that raises an `HttpError` for its own failures.                                          |
