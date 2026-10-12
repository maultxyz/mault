export class ApiStatusError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`API error: ${status}`);
    this.name = "ApiStatusError";
    this.status = status;
  }
}
