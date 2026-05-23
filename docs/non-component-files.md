# Non-component Files

## Rules

### Co-location and promotion

| Artefact | First home | Promote to | When |
|---|---|---|---|
| Utils | Inline in component/hook | `utils/` | Immediately — pure functions with no codebase imports go straight to `utils/` |
| Types | Inline in file | `types/` | Second consumer outside the folder |
| Schemas | Inline in file | `schemas/` | Second consumer outside the folder |
| Constants | Inline in file | `constants/` | Second consumer outside the folder |
| Translations | Inline in file | `translations/` | Second consumer outside the folder |
| Hooks | Inline in component | `hooks/` at nearest common ancestor | Second independent consumer |

### Bubbling rule

All files follow the same bubbling rule:

> Start at the lowest level where it is first needed. When a second consumer appears outside that folder, promote to the nearest common ancestor. Repeat.

### File organisation

| Artefact | File structure | Barrel index |
|---|---|---|
| Utils | One function per file or grouped by domain | No |
| Hooks | One hook per file | No |
| Types / Schemas | One type per file or grouped by domain | Yes |
| Constants / Translations | Always grouped by domain | Yes |

---

## Examples

### Utils — straight to `utils/`, no barrel index

Pure functions with no codebase imports go directly to `utils/` — no co-location step.

```tsx
// ❌ Bad — logic mixed inside the component
export const VideoCard = ({ video }: Props) => {
  const minutes = Math.floor(video.duration / 60);
  const seconds = String(video.duration % 60).padStart(2, '0');
  const formatted = `${minutes}:${seconds}`;

  return <span>{formatted}</span>;
};

// ✅ Good — pure function extracted to utils/
// utils/format-duration.ts
export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// video-card.tsx
export const VideoCard = ({ video }: Props) => (
  <span>{formatDuration(video.duration)}</span>
);
```

### File organisation

```
# Utils — no barrel index
utils/
  format-duration.ts           ← single function
  video.ts                     ← grouped by domain

# Hooks — no barrel index
hooks/
  useUrlFilters.ts             ← single hook
  useScreenSize.ts             ← single hook

# Types / Schemas — use barrel index
types/
  pagination.ts                ← single type
  video.ts                     ← grouped by domain
  index.ts                     ← re-exports all

# Constants / Translations — use barrel index
constants/
  video.ts                     ← grouped by domain
  partnerPortal.ts             ← grouped by domain
  index.ts                     ← re-exports all
```

### Hooks — inline first, extract when reused

**Step 1 — only used in `VideoListing` → inline:**

```tsx
// components/video/VideoListing/VideoListing.tsx
export const VideoListing = () => {
  const [filters, setFilters] = useState<Filters>(parseUrlFilters());
  useEffect(() => { pushUrlFilters(filters); }, [filters]);

  return (
    <div>
      <ListingFilters filters={filters} onFiltersChange={setFilters} />
      <VideoGrid filters={filters} />
      <Pagination
        page={filters.page}
        onPageChange={page => setFilters({ ...filters, page })}
      />
    </div>
  );
};
```

**Step 2 — `MobileVideoListing` also needs it → extract to nearest common ancestor:**

```tsx
// components/video/hooks/useUrlFilters.ts
export const useUrlFilters = () => {
  const [filters, setFilters] = useState<Filters>(parseUrlFilters());
  useEffect(() => { pushUrlFilters(filters); }, [filters]);
  return { filters, setFilters };
};

// components/video/VideoListing/VideoListing.tsx
export const VideoListing = () => {
  const { filters, setFilters } = useUrlFilters();

  return (
    <div>
      <ListingFilters filters={filters} onFiltersChange={setFilters} />
      <VideoGrid filters={filters} />
      <Pagination
        page={filters.page}
        onPageChange={page => setFilters({ ...filters, page })}
      />
    </div>
  );
};

// components/video/MobileVideoListing/MobileVideoListing.tsx
export const MobileVideoListing = () => {
  const { filters, setFilters } = useUrlFilters();

  return (
    <div>
      <MobileFilterDrawer filters={filters} onFiltersChange={setFilters} />
      <VideoCarousel filters={filters} />
    </div>
  );
};
```
