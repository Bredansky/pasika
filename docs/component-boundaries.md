# Component Boundaries

How to decide which components coordinate behaviour and which components stay presentational.

## Smart vs Dumb

**Smart** component:

- defines `handle*` functions and passes them as `on*` props to child components
- fetches data or performs another Effect

**Dumb** component:

- never creates `handle*` functions for child components
- may own local UI state
- may use inline closures on DOM elements (`<button onClick={...}>`)

**Test:** look at `on*` props on PascalCase children. If the function is defined here as `handle*`, this component is smart.

## Examples

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
