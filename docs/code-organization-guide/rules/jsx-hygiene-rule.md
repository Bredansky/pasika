# JSX Hygiene Rule

JSX should show the component's structure, not its calculations. This rule moves complex expressions before `return` while keeping simple JSX readable.

- Arithmetic, chained built-in method calls, calls to functions declared outside the component, nested ternaries, and conditions containing two or more logical operators MUST be extracted before `return`, including in JSX attributes.
- An inline expression MAY contain one condition with up to one logical operator, one ternary, or one built-in method call. `cn()` MAY be called inline. An event handler MAY make one call inline.

## Incorrect — Computation in JSX

```tsx
return (
  <div>
    <span>{Math.floor((Date.now() - new Date(record.updatedAt).getTime()) / 86400000)} {locales.daysAgo}</span>
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

Why: calculations, chained methods, function calls, nested ternaries, and long guards all belong outside the return.

## Correct — Computation Before `return`

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
    <span>{daysSinceUpdate} {locales.daysAgo}</span>
    <ul>{activeItems.map(renderItem)}</ul>
    <p>
      {updatedLabel} — {total}
    </p>
    {statusView}
    {scorePercent}%
    <div className={cn("base-surface", isActive && "primary-surface")} />
    {canShowAdmin && <AdminPanel />}
    <span>{publishDate}</span>
  </div>
);
```

Why: calculations, chained methods, custom function calls, and nested ternaries now resolve before the return, so only simple conditions, single method calls, and `cn()` stay inline.
