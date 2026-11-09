export class CardHoldRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string | undefined) {
    super(message ?? `Hold request failed with status ${status}.`);
    this.status = status;
  }
}
