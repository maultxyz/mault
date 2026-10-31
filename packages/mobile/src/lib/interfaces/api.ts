export interface LocalAuthResponse {
  success: boolean;
  message?: string;
  data?: { token: string; user: { id: string; name: string | null; email: string } };
}

export interface RequestAuth {
  token: string | null;
  orgId: string | null;
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  form?: FormData;
  orgId?: string | null;
  acceptStatuses?: number[];
}

export interface MemberSeatLock {
  orgId: string;
  limit: number;
}

export interface MemberSeatLockedProps {
  lock: MemberSeatLock;
}
