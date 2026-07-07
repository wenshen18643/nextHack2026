import { describe, expect, it } from "vitest";
import {
  build_stripe_signature_header,
  verify_stripe_signature,
} from "./stripe_client";

const endpoint_secret = "whsec_test_secret";
const payload = JSON.stringify({ type: "checkout.session.completed" });

describe("verify_stripe_signature", () => {
  it("accepts a freshly signed payload", () => {
    const header = build_stripe_signature_header(payload, endpoint_secret);
    expect(verify_stripe_signature(payload, header, endpoint_secret)).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(verify_stripe_signature(payload, null, endpoint_secret)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const header = build_stripe_signature_header(payload, endpoint_secret);
    expect(verify_stripe_signature(`${payload} `, header, endpoint_secret)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const header = build_stripe_signature_header(payload, "whsec_wrong");
    expect(verify_stripe_signature(payload, header, endpoint_secret)).toBe(false);
  });

  it("rejects a stale timestamp outside the replay tolerance", () => {
    const stale_timestamp = Math.floor(Date.now() / 1000) - 600;
    const header = build_stripe_signature_header(payload, endpoint_secret, stale_timestamp);
    expect(verify_stripe_signature(payload, header, endpoint_secret)).toBe(false);
  });

  it("rejects headers without any v1 signature", () => {
    expect(
      verify_stripe_signature(payload, `t=${Math.floor(Date.now() / 1000)}`, endpoint_secret),
    ).toBe(false);
  });

  it("accepts when one of several v1 signatures matches", () => {
    const header = build_stripe_signature_header(payload, endpoint_secret);
    const padded = `${header},v1=deadbeef`;
    expect(verify_stripe_signature(payload, padded, endpoint_secret)).toBe(true);
  });
});
