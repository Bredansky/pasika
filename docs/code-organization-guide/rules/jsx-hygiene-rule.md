# JSX Hygiene Rule

Logic mixed into JSX `return` blocks makes the render tree hard to scan and obscures the component's structure.

- Math expressions, method chains, custom function calls, nested ternaries, and conditions containing two or more logical operators MUST be extracted before `return`.
- A condition containing at most one logical operator, a single ternary, a single built-in method call, and `cn()` MAY stay inline.
- Chained built-in method calls MUST be extracted (they count as computation).

## Incorrect

```tsx
return (
  <div>
    <span>{Math.floor((Date.now() - new Date(record.updatedAt).getTime()) / 86400000)} days ago</span>
    <ul>
      {items
        .filter((x) => x.active)
        .sort(byDate)
        .map(renderItem)}
    </ul>
    <p>
      {formatDate(record.updatedAt, "long")} — {calculateTotal(items)}
    </p>
    {isLoading ? <Spinner /> : hasError ? <Error /> : <Content />}
    {isLoggedIn && hasPermission && isOwner && featureEnabled && <AdminPanel />}
    <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
    {Math.round(score * 100)}%
  </div>
);
```

Why: math expressions, chained methods, function calls, nested ternaries, and long guards all belong outside the return.

## Correct

```tsx
const daysSinceUpdate = Math.floor((Date.now() - new Date(record.updatedAt).getTime()) / 86400000);
const activeItems = items.filter((x) => x.active).sort(byDate);
const updatedLabel = formatDate(record.updatedAt, "long");
const total = calculateTotal(items);
const canShowAdmin = isLoggedIn && hasPermission && isOwner && featureEnabled;
const publishDate = new Date(post.publishedAt).toLocaleDateString();
const scorePercent = Math.round(score * 100);

let statusView = <Content />;
if (isLoading) {
  statusView = <Spinner />;
} else if (hasError) {
  statusView = <Error />;
}

return (
  <div>
    <span>{daysSinceUpdate} days ago</span>
    <ul>{activeItems.map(renderItem)}</ul>
    <p>
      {updatedLabel} — {total}
    </p>
    {statusView}
    <span>{video.title.toUpperCase()}</span>
    {items.map((item) => (
      <li>{item.name}</li>
    ))}
    {isActive ? "Active" : "Inactive"}
    {scorePercent}%
    <div className={cn("base", isActive && "bg-primary-100")} />
    {canShowAdmin && <AdminPanel />}
    <span>{publishDate}</span>
  </div>
);
```

Why: every math expression, chained method, custom function call, and nested ternary now resolves before the return, so only simple conditions, single method calls, and `cn()` stay inline.
