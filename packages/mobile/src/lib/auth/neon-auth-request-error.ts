export class NeonAuthRequestError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null) {
    super(message);
    this.name = "NeonAuthRequestError";
    this.code = code;
  }
}
