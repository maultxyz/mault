export interface RecurringPriceInfo {
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
}

export interface ActiveSubscriptionGroup {
  plan: string;
  stripePriceId: string | null;
  status: string | null;
  subscriberCount: number;
}
