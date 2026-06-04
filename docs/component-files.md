# Component Files

How to name, group, and place component files.

## Naming

**Smart** component — defines `handle*` functions and passes them as `on*` props to child components, or fetches data:

- named `PascalCase.tsx`

**Dumb** component — never creates `handle*` functions for child components; may own local UI state; may use inline closures on DOM elements:

- named `kebab-case.tsx`

**Test:** look at `on*` props on PascalCase children. If the function is defined here as `handle*`, this component is smart.

### Smart component

Defines handlers, coordinates children, fetches data:

```tsx
// VideoBrowser.tsx
export const VideoBrowser = () => {
  const { data: videos } = useVideos();
  const [playing, setPlaying] = useState<string | null>(null);
  const handlePlay = (id: string) => setPlaying(id);

  return (
    <div>
      {videos.map(v => (
        <VideoCard key={v.id} video={v} onPlay={handlePlay} />
      ))}
      <PlayStatus playing={playing} />
    </div>
  );
};
```

### Dumb component

No `handle*` functions for children. Local UI state and inline DOM callbacks are fine:

```tsx
// video-card.tsx
export const VideoCard = ({ video }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <img src={video.thumb} alt={video.title} />
      <h3>{video.title}</h3>
      <PlayLink href={video.url} />
      <button onClick={() => setExpanded(!expanded)}>Details</button>
    </div>
  );
};
```

## Folder structure

Promote to a subfolder when a component gets exclusive children no sibling needs.

The promoted component becomes a folder; extracted children live alongside it:

```
video/
  index.ts
  VideoListing/
    index.ts        ← re-exports VideoListing only, not video-modal or video-controls
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
