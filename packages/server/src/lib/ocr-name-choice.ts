function wordsOfName(name: string): string[] {
  return name
    .toLocaleUpperCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function containsEveryWordAndMore(nameWords: string[], readWords: string[]): boolean {
  return (
    nameWords.length > readWords.length &&
    readWords.every((readWord) => nameWords.includes(readWord))
  );
}

export function preferClosestNameMissingUnreadWords<
  Match extends { score: number; distance: number },
>(matches: Match[], nameOf: (match: Match) => string, readName: string): Match[] {
  const [topScoredMatch] = matches;
  const readWords = wordsOfName(readName);
  if (!topScoredMatch || readWords.length === 0) return matches;
  const readsExactName = matches.some(
    (match) => wordsOfName(nameOf(match)).join(" ") === readWords.join(" "),
  );
  if (readsExactName) return matches;
  const closestDistanceByName = new Map<string, number>();
  for (const match of matches) {
    const name = nameOf(match);
    if (!containsEveryWordAndMore(wordsOfName(name), readWords)) continue;
    const closestDistance = closestDistanceByName.get(name);
    if (closestDistance === undefined || match.distance < closestDistance) {
      closestDistanceByName.set(name, match.distance);
    }
  }
  if (
    closestDistanceByName.size < 2 ||
    !closestDistanceByName.has(nameOf(topScoredMatch))
  ) {
    return matches;
  }
  const [closestName] = [...closestDistanceByName.entries()].reduce(
    (closest, candidate) => (candidate[1] < closest[1] ? candidate : closest),
  );
  return [
    ...matches
      .filter((match) => nameOf(match) === closestName)
      .sort((first, second) => first.distance - second.distance),
    ...matches.filter((match) => nameOf(match) !== closestName),
  ];
}
