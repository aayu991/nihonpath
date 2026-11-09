/** Future server-side adapter contract. No embedded provider is configured. */
export interface LessonMeetingProvider {
  readonly kind: "external" | "embedded";
  provision(context: {
    bookingId: string;
    tutorId: string;
    learnerId: string;
    endsAt: string;
  }): Promise<{
    url: string;
    expiresAt: string;
    providerReference: string | null;
  }>;
  revoke(context: {
    bookingId: string;
    providerReference: string | null;
  }): Promise<void>;
}
export type BookingPriceSnapshot = {
  priceMinor: number;
  currency: "JPY" | "USD" | "NPR" | "INR";
  collection: "not_required" | "unavailable";
};
