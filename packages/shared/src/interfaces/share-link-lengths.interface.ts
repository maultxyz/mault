export interface ShareLinkLengths {
  tradeLinkHours: number;
  restrictedShareLinkHours: number;
  monitorLinkExpiryDays: number[];
}

export interface AdminShareLinkLengthsResponse {
  lengths: ShareLinkLengths;
  defaults: ShareLinkLengths;
}

export interface ShareLinkDuration {
  unit: "hours" | "days";
  count: number;
}
