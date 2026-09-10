import { isAuthError } from "own-auth";

export function authErrorResponse(err: unknown) {
  if (isAuthError(err)) {
    return { message: err.safeMessage, status: err.statusCode as 400 };
  }
  throw err;
}
