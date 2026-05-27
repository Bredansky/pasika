# Component Composition

How to split JSX into named components.

## Rules

### No mixed concerns

1 file = 1 component.

### Flatten

**Composition** = elements you can interact with natively (`button`, `a`, `input`, `select`, `textarea`) + custom React components.

**Transparent** = everything else: layout wrappers (`div`, `span`, semantic HTML), conditionals (`&&`, ternary, `.map()`), infrastructure (`Suspense`, `ErrorBoundary`, `lazy()`, `memo()`, `forwardRef()`), fragments (`<>`).

**Rule:** if a composition wraps another composition, extract the pair as a named component.

```tsx
// Bad
<button><Icon /></button>

// Good
<IconButton />
```

Transparent elements are see-through for the flatten rule. They do not count as a wrapping layer.

Always flatten first, then apply group sibling rules to the result.

### Group siblings

Extract a block when any of these triggers fire:

- **Sole state owner**: block is the only consumer of a piece of state, so extract it and let it own the state
- **Repeated structure**: same flat structure appears in 2+ places
- **Nameable visual concept**: siblings together form a recognisable, nameable concept

## Examples

### Before: nested compositions and repeated structure

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
        <Tooltip label="Search">
          <button onClick={() => search(query)}>
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
            <a href={v.url}>
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
            <a href={v.url}>
              <PlayIcon />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### After flatten: composition pairs extracted

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
        <HintSearchButton onClick={() => search(query)} />
      </div>

      <div>
        <h2>Trending</h2>
        {trending.map(v => (
          <div>
            <img src={v.thumb} alt={v.title} />
            <h3>{v.title}</h3>
            <PlayLink href={v.url} />
          </div>
        ))}
      </div>

      <div>
        <h2>Latest</h2>
        {latest.map(v => (
          <div>
            <img src={v.thumb} alt={v.title} />
            <h3>{v.title}</h3>
            <PlayLink href={v.url} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### After grouping: named blocks extracted

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
