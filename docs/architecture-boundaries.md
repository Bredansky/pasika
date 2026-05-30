# Architecture Boundaries

How to decide whether code belongs to a feature, composition, shared module, or route layer.

## Feature

A feature is a product or domain area with its own data contract, behavior, UI, and local rules.

A folder deserves to be a feature when it has at least one of these:

- It has its own external integration or data contract.
- It has reusable domain behavior across more than one route, page, or composition.
- It has enough domain-specific UI or state that isolating it reduces mental load.
- It should be independently testable or changeable without touching the surface that displays it.

A folder probably does not deserve to be a feature when:

- It is only presentation for one page.
- It has no independent data fetching or domain logic.
- It only exists to avoid a large component file.
- Its components are not reused and are tightly coupled to one route layout.

## Composition

A composition combines features and shared modules into a route, page section, workflow, or other user-facing surface.

Compositions own cross-feature orchestration:

- choosing which features appear together
- arranging feature sections into a user-facing flow
- passing route/page data into features
- handling cross-feature fallbacks, loading states, and empty states

Compositions may import multiple features. Features must not import other features.

## Shared Module

A shared module is reusable infrastructure or UI that is not owned by one feature or composition.

Shared modules may be imported by features, compositions, and route files. Shared modules must not import from features, compositions, or route-private folders.

## Route Layer

The route layer is framework-specific. Route files choose and render compositions, define route metadata, and handle framework conventions.

Keep route files thin. Domain behavior belongs in features, and cross-feature page structure belongs in compositions.

## Import Boundaries

- Features may import from their own feature folder and shared modules.
- Features must not import from other features.
- Features must not import compositions or route-private files.
- Compositions may import features and shared modules.
- Shared modules may import only other shared modules or lower-level libraries.
- Route files may import compositions, features, and shared modules, but should stay thin.
