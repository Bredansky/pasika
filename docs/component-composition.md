# Component Composition

## Rules

### No mixed concerns

1 file = 1 component.

### Flatten

**Composition** = elements you can interact with natively (`button`, `a`, `input`, `select`, `textarea`) + custom React components.

**Transparent** = everything else: layout wrappers (`div`, `span`, semantic HTML), conditionals (`&&`, ternary, `.map()`), infrastructure (`Suspense`, `ErrorBoundary`, `lazy()`, `memo()`, `forwardRef()`), fragments (`<>`).

**Rule:** if a composition wraps another composition → extract the pair as a named component.

```tsx
// ❌
<button><Icon /></button>

// ✅
<IconButton />
```

Transparent elements are see-through for the flatten rule — they do not count as a wrapping layer.

Always flatten first, then apply group siblings rules to the result.

### Group siblings

Extract a block when any of these triggers fire:

- **Sole state owner** — block is the only consumer of a piece of state → extract and let it own the state
- **Repeated structure** — same flat structure appears in 2+ places → extract
- **Nameable visual concept** — siblings together form a recognisable, nameable concept → extract

### Smart vs Dumb

**Smart** component:
- defines `handle*` functions and passes them as `on*` props to child components
- fetches data or performs another Effect

**Dumb** component:
- never creates `handle*` functions for child components
- inline closures on DOM elements (`<button onClick={...}>`) are fine

**Test:** look at `on*` props on PascalCase children — defined here as `handle*`? → Smart.

### Folder structure

- Smart → `PascalCase.tsx`
- Dumb → `kebab-case.tsx`
- Promote to a subfolder when a component gets exclusive children no sibling needs
- Promoted component becomes a folder; extracted children live alongside it:

```
video/
  index.ts
  VideoListing/
    index.ts
    VideoListing.tsx        ← smart entry
    video-modal.tsx         ← exclusive child
    video-controls.tsx      ← exclusive child
  video-card.tsx            ← sibling stays put
```

### Placement (bubbling)

- Used by exactly one component → colocate next to that component
- Used by multiple siblings → `shared/` at nearest common ancestor
- Used across multiple features → `components/shared/`
- `components/shared/` is the ceiling — components never bubble further

---

## Examples

### Before — nested compositions and repeated structure

```tsx
export const VideoBrowser = ({ user }: Props) => {
  const [query, setQuery] = useState('');

  return (
    <div>
      <img src={logo} alt="logo" />
      <h1>VideoBrowser</h1>
      <div>
        <img src={user.avatar} alt={user.name} className="rounded-full" />
        <span>{user.name}</span>
      </div>

      <div>
        <input value={query} onChange={e => setQuery(e.target.value)} />
        <Tooltip label="Search">                         {/* ❌ Tooltip (composition) wraps button (composition) */}
          <button onClick={() => search(query)}>         {/* ❌ button (composition) wraps SearchIcon (composition) */}
            <SearchIcon />
          </button>
        </Tooltip>
      </div>

      <div>
        <h2>Trending</h2>
        {trending.map(v => (
          <div>
            <img src={v.thumb} alt={v.title} />
            <h3>{v.title}</h3>
            <a href={v.url}>                             {/* ❌ a (composition) wraps PlayIcon (composition) */}
              <PlayIcon />
            </a>
          </div>
        ))}
      </div>

      <div>
        <h2>Latest</h2>
        {latest.map(v => (
          <div>
            <img src={v.thumb} alt={v.title} />
            <h3>{v.title}</h3>
            <a href={v.url}>                             {/* ❌ a (composition) wraps PlayIcon (composition) */}
              <PlayIcon />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### After flatten — composition pairs extracted

```tsx
export const VideoBrowser = ({ user }: Props) => {
  const [query, setQuery] = useState('');             {/* ⚠️ sole state owner — extract with its block */}

  return (
    <div>
      <img src={logo} alt="logo" />                   {/* ⚠️ logo + title + avatar = nameable concept */}
      <h1>VideoBrowser</h1>
      <div>
        <img src={user.avatar} alt={user.name} className="rounded-full" />
        <span>{user.name}</span>
      </div>

      <div>                                           {/* ⚠️ sole state owner — query only used here */}
        <input value={query} onChange={e => setQuery(e.target.value)} />
        <HintSearchButton onClick={() => search(query)} />  {/* ✅ button+SearchIcon → SearchButton, Tooltip+SearchButton → HintSearchButton */}
      </div>

      <div>
        <h2>Trending</h2>
        {trending.map(v => (
          <div>                                       {/* ⚠️ repeated structure (×2 with Latest) */}
            <img src={v.thumb} alt={v.title} />
            <h3>{v.title}</h3>
            <PlayLink href={v.url} />                 {/* ✅ a+PlayIcon extracted */}
          </div>
        ))}
      </div>

      <div>
        <h2>Latest</h2>
        {latest.map(v => (
          <div>                                       {/* ⚠️ repeated structure (×2 with Trending) */}
            <img src={v.thumb} alt={v.title} />
            <h3>{v.title}</h3>
            <PlayLink href={v.url} />                 {/* ✅ a+PlayIcon extracted */}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### After grouping — sole state owner, repeated structure, nameable concept extracted

```tsx
export const VideoBrowser = ({ user }: Props) => {
  return (
    <div>
      <PageHeader user={user} />
      <SearchBar onSearch={search} />
      <VideoSection title="Trending" videos={trending} />
      <VideoSection title="Latest" videos={latest} />
    </div>
  );
};
```

### Smart vs Dumb

**Smart** — defines handlers, coordinates children, fetches data:

```tsx
// VideoBrowser.tsx
export const VideoBrowser = () => {
  const { data: videos } = useVideos();
  const [playing, setPlaying] = useState<string | null>(null);
  const handlePlay = (id: string) => setPlaying(id);   // ✅ handle* → passed as on*

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

**Dumb** — no `handle*` for children, inline closures on DOM only. Local UI state is fine:

```tsx
// video-card.tsx
export const VideoCard = ({ video }: Props) => {
  const [expanded, setExpanded] = useState(false);     // ✅ local UI state is fine

  return (
    <div>
      <img src={video.thumb} alt={video.title} />
      <h3>{video.title}</h3>
      <PlayLink href={video.url} />
      <button onClick={() => setExpanded(!expanded)}>Details</button>  // ✅ inline on DOM element
    </div>
  );
};
```

### Folder structure

```
// Default — flat, no exclusive children
components/video/
  index.ts
  VideoBrowser.tsx
  video-card.tsx
  genre-filter.tsx
  play-button.tsx
```

```
// VideoBrowser gets exclusive children — promoted to a folder
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

### Placement

**Bad** — `shared/` when used by single consumer:

```
components/
  partnerPortal/
    shared/
      VideoCard.tsx         // ❌ used only by PartnerVideoModal — belongs colocated
```

**Good** — placement ladder:

```
components/
  billing/
    InvoicePage.tsx
    InvoiceTable.tsx                  // ✅ used only by InvoicePage → colocated
    PaymentPage.tsx
    shared/
      StatusBadge.tsx                 // ✅ used by InvoicePage + PaymentPage → shared/
      status-icon.tsx                 // ✅ dumb — kebab-case applies in shared/ too
  shared/
    ModalShell.tsx                    // ✅ used by billing + dashboard → shared/
```
