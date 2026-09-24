import { vi } from "vitest";

export const paymentIntentsCreate = vi.fn();
export const paymentIntentsRetrieve = vi.fn();

// A partial mock of the "stripe" package: the real SDK, except that
// PaymentIntent calls hit these spies instead of the network. Everything
// else — notably `webhooks`, whose signature check is a local HMAC — stays
// real. Use it from a test file as:
//
//   vi.mock("stripe", async () =>
//     (await import("@/test/stripeMock")).stripeWithSpiedPaymentIntents()
//   );
export async function stripeWithSpiedPaymentIntents() {
  const actual = await vi.importActual<typeof import("stripe")>("stripe");
  const RealStripe = actual.default;

  class StripeWithSpies extends RealStripe {
    constructor(...args: ConstructorParameters<typeof RealStripe>) {
      super(...args);
      this.paymentIntents = {
        create: paymentIntentsCreate,
        retrieve: paymentIntentsRetrieve,
      } as unknown as InstanceType<typeof RealStripe>["paymentIntents"];
    }
  }

  return { ...actual, default: StripeWithSpies };
}
