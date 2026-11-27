import { parentPort } from "node:worker_threads";
import { nearestCardFaceRows } from "./card-match-nearest";
import type {
  CardMatchWorkerReply,
  CardMatchWorkerRequest,
} from "./interfaces/card-match-index";

parentPort?.on("message", (request: CardMatchWorkerRequest) => {
  const reply: CardMatchWorkerReply = {
    requestId: request.requestId,
    rows: nearestCardFaceRows(request.segments, request.query, request.limit),
  };
  parentPort?.postMessage(reply);
});
