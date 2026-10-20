export interface Response {
  success: boolean;
  message: string;
}

export interface Result<T> extends Response {
  data?: T;
}

export interface AuthResponse extends Response {
  redirect?: string;
}
