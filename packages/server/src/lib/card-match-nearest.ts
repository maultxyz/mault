import { MILO_EMBEDDING_DIM } from "./constants/card-search";
import type {
  CardMatchEmbeddingArrays,
  NearestCardFaceRow,
} from "./interfaces/card-match-index";

function quantizedCosineDistance(
  embeddings: Int8Array,
  offset: number,
  scale: number,
  query: Float32Array,
): number {
  let sum0 = 0;
  let sum1 = 0;
  let sum2 = 0;
  let sum3 = 0;
  for (let i = 0; i < MILO_EMBEDDING_DIM; i += 4) {
    sum0 += embeddings[offset + i] * query[i];
    sum1 += embeddings[offset + i + 1] * query[i + 1];
    sum2 += embeddings[offset + i + 2] * query[i + 2];
    sum3 += embeddings[offset + i + 3] * query[i + 3];
  }
  return 1 - (sum0 + sum1 + sum2 + sum3) * scale;
}

export function frontFaceDistance(
  segment: CardMatchEmbeddingArrays,
  row: number,
  query: Float32Array,
): number {
  return quantizedCosineDistance(
    segment.frontEmbeddings,
    row * MILO_EMBEDDING_DIM,
    segment.frontEmbeddingScales[row],
    query,
  );
}

export function backFaceDistance(
  segment: CardMatchEmbeddingArrays,
  row: number,
  query: Float32Array,
): number {
  const backFaceIndex = segment.backFaceIndexByRow[row];
  return backFaceIndex < 0
    ? Infinity
    : quantizedCosineDistance(
        segment.backEmbeddings,
        backFaceIndex * MILO_EMBEDDING_DIM,
        segment.backEmbeddingScales[backFaceIndex],
        query,
      );
}

export function nearestCardFaceRows(
  segments: CardMatchEmbeddingArrays[],
  query: Float32Array,
  limit: number,
): NearestCardFaceRow[] {
  const nearest: NearestCardFaceRow[] = [];
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const segment = segments[segmentIndex];
    for (let row = 0; row < segment.rowCount; row++) {
      const frontDistance = frontFaceDistance(segment, row, query);
      const backDistance = backFaceDistance(segment, row, query);
      const isBackFace = backDistance < frontDistance;
      const distance = isBackFace ? backDistance : frontDistance;
      if (nearest.length === limit && distance >= nearest[limit - 1].distance) {
        continue;
      }
      let position = Math.min(nearest.length, limit - 1);
      while (position > 0 && distance < nearest[position - 1].distance) {
        position--;
      }
      nearest.splice(position, 0, { segmentIndex, row, isBackFace, distance });
      if (nearest.length > limit) nearest.pop();
    }
  }
  return nearest;
}
