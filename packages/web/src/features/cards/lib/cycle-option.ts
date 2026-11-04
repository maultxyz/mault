export function nextCycledOption<Option>(
  options: readonly Option[],
  current: Option,
): Option {
  const currentIndex = options.indexOf(current);
  return options[(currentIndex + 1) % options.length];
}
