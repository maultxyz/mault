export function moveListItem<Item>(items: Item[], from: number, to: number): Item[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
