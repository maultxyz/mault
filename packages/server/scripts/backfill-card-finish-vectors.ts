import { db } from "../src/db";
import { cardImageVectors } from "../src/db/schema";
import { syncCardFinishVectors } from "../src/lib/card-finish-vectors";

async function main() {
  const scopes = await db
    .selectDistinct({ gameKey: cardImageVectors.gameKey, lang: cardImageVectors.lang })
    .from(cardImageVectors);
  let written = 0;
  for (const { gameKey, lang } of scopes) {
    written += await syncCardFinishVectors(gameKey, lang, console.log);
  }
  console.log(`Done: ${written} card finish image(s) vectorized.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
