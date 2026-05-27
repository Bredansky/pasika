# Component Files

How to name, group, and place component files.

## Naming

- Smart components use `PascalCase.tsx`
- Dumb components use `kebab-case.tsx`

## Folder structure

Promote to a subfolder when a component gets exclusive children no sibling needs.

The promoted component becomes a folder; extracted children live alongside it:

```
video/
  index.ts
  VideoListing/
    index.ts
    VideoListing.tsx
    video-modal.tsx
    video-controls.tsx
  video-card.tsx
```

## Placement

- Used by exactly one component: colocate next to that component
- Used by multiple siblings: `shared/` at nearest common ancestor
- Used across multiple features: `components/shared/`
- `components/shared/` is the ceiling; components never bubble further

## Examples

### Default: flat, no exclusive children

```
components/video/
  index.ts
  VideoBrowser.tsx
  video-card.tsx
  genre-filter.tsx
  play-button.tsx
```

### Promoted folder: exclusive children

```
components/video/
  index.ts
  video-card.tsx
  genre-filter.tsx
  play-button.tsx
  VideoBrowser/
    index.ts
    VideoBrowser.tsx
    video-modal.tsx
    video-controls.tsx
```

### Bad: shared when used by one consumer

```
components/
  partnerPortal/
    shared/
      VideoCard.tsx
```

If `VideoCard.tsx` is used only by `PartnerVideoModal`, it belongs next to `PartnerVideoModal`.

### Good: placement ladder

```
components/
  billing/
    InvoicePage.tsx
    InvoiceTable.tsx
    PaymentPage.tsx
    shared/
      StatusBadge.tsx
      status-icon.tsx
  shared/
    ModalShell.tsx
```

- `InvoiceTable.tsx` is used only by `InvoicePage`, so it is colocated.
- `StatusBadge.tsx` and `status-icon.tsx` are used by billing siblings, so they live in `billing/shared/`.
- `ModalShell.tsx` is used by billing and dashboard, so it lives in `components/shared/`.
