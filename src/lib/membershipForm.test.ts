import { describe, it, expect } from "vitest";
import {
  formatNationalNumber,
  nanpDigitLimit,
  reconcileMulti,
  reconcileSingle,
  resolveMulti,
  resolveSingle,
} from "@/lib/membershipForm";

describe("resolveMulti", () => {
  it("joins the selected options", () => {
    expect(resolveMulti({ selected: ["Hindu", "Sikh"], otherText: "" })).toBe("Hindu, Sikh");
  });

  it('replaces "Other" with what the person typed, in place', () => {
    expect(
      resolveMulti({ selected: ["Hindu", "Other", "Sikh"], otherText: "  Zoroastrian " })
    ).toBe("Hindu, Zoroastrian, Sikh");
  });

  it('drops "Other" when nothing was typed, rather than recording the word "Other"', () => {
    expect(resolveMulti({ selected: ["Other", "Jain"], otherText: "   " })).toBe("Jain");
  });

  it("caps the result at 500 characters, Stripe's metadata limit", () => {
    const long = "x".repeat(600);
    expect(resolveMulti({ selected: ["Other"], otherText: long })).toHaveLength(500);
  });
});

describe("resolveSingle", () => {
  it("returns the selected option", () => {
    expect(resolveSingle({ selected: "Female", otherText: "ignored" })).toBe("Female");
  });

  it('returns the typed text for "Other"', () => {
    expect(resolveSingle({ selected: "Other", otherText: " Non-binary " })).toBe("Non-binary");
  });

  it("caps the result at 500 characters", () => {
    expect(resolveSingle({ selected: "Other", otherText: "y".repeat(600) })).toHaveLength(500);
  });
});

describe("reconcileSingle", () => {
  // Saved form state comes back from localStorage, possibly after the
  // options were edited in Studio. A saved choice that no longer exists must
  // not be silently submitted.
  it("keeps a choice that is still offered", () => {
    const f = { selected: "Male", otherText: "" };
    expect(reconcileSingle(f, ["Male", "Female"])).toBe(f);
  });

  it("clears a choice that was removed from the options", () => {
    expect(reconcileSingle({ selected: "Retired Option", otherText: "" }, ["Male"])).toEqual({
      selected: "",
      otherText: "",
    });
  });

  it('keeps "Other" and an empty selection as-is', () => {
    const other = { selected: "Other", otherText: "typed" };
    const empty = { selected: "", otherText: "" };
    expect(reconcileSingle(other, [])).toBe(other);
    expect(reconcileSingle(empty, [])).toBe(empty);
  });
});

describe("reconcileMulti", () => {
  it('filters out removed options but keeps "Other" and its text', () => {
    expect(
      reconcileMulti({ selected: ["Hindu", "Gone", "Other"], otherText: "typed" }, ["Hindu"])
    ).toEqual({ selected: ["Hindu", "Other"], otherText: "typed" });
  });
});

describe("formatNationalNumber", () => {
  it("formats a US number progressively as digits are typed", () => {
    expect(formatNationalNumber("", "US")).toBe("");
    expect(formatNationalNumber("8", "US")).toBe("(8");
    expect(formatNationalNumber("814", "US")).toBe("(814");
    expect(formatNationalNumber("8148", "US")).toBe("(814) 8");
    expect(formatNationalNumber("814865", "US")).toBe("(814) 865");
    expect(formatNationalNumber("8148651234", "US")).toBe("(814) 865-1234");
  });

  it("stops at 10 digits for North American numbers", () => {
    expect(formatNationalNumber("81486512349999", "US")).toBe("(814) 865-1234");
    expect(formatNationalNumber("4165551234", "CA")).toBe("(416) 555-1234");
  });

  it("uses the phone library's formatting outside North America", () => {
    const formatted = formatNationalNumber("9876543210", "IN");
    expect(formatted.replace(/\D/g, "")).toBe("9876543210");
  });
});

describe("nanpDigitLimit", () => {
  it("limits North American numbers to 10 digits and leaves others open", () => {
    expect(nanpDigitLimit("US")).toBe(10);
    expect(nanpDigitLimit("PR")).toBe(10);
    expect(nanpDigitLimit("IN")).toBeNull();
  });
});
