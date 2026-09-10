# Glossary Reference

Use this reference to look up the terms this guide's workflows and rules use. Terms are grouped by the decision they support.

## Structure Terms

These terms name the parts of the `src/` tree and the way an item's location is derived from its consumers.

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

| Term                      | Definition                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smart component           | A component that fetches data, or that defines `handle*` callbacks and passes them to children as `on*` props.                                                                                                                                                                                                                                                                                                    |
| Dumb component            | A component that neither fetches data nor defines `handle*` callbacks for children.                                                                                                                                                                                                                                                                                                                               |
| Exclusive child component | A component imported only by its parent component.                                                                                                                                                                                                                                                                                                                                                                |
| Nested component          | A component that lives in a folder carrying its own name, together with its exclusive children and their support files.                                                                                                                                                                                                                                                                                           |
| Interactive element       | An HTML element the HTML specification lists as [interactive content](https://html.spec.whatwg.org/multipage/dom.html#interactive-content).                                                                                                                                                                                                                                                                       |
| Imperative category       | One of React's built-in hook APIs called directly in a hook body — `useState`, `useEffect`, `useContext`, `useReducer`, `useCallback`, `useMemo`, `useRef`, `useLayoutEffect`, `useImperativeHandle`, `useDebugValue`, `useDeferredValue`, `useTransition`, `useId`, `useSyncExternalStore`, or `useInsertionEffect` — where each distinct name called counts as one category, regardless of what runs inside it. |

## Route Handler Terms

These terms name the parts of a `route.ts` handler's body the Route Handler Rule scores to decide whether it must be extracted.

| Term             | Definition                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| External call    | An awaited call in a route handler's body other than one reading the incoming request, e.g. `request.json()` or `req.headers.get()`. |
| Extraction score | One point for each external call in a route handler's body, plus one more if a loop contains at least one external call.             |
