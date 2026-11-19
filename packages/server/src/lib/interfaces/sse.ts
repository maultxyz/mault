export type SerializedSseData = () => string;

export type SseWriter = (
  event: string,
  data: unknown,
  serializedData?: SerializedSseData,
) => void;
