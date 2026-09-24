import type { Country } from "react-phone-number-input";
import { AsYouType } from "libphonenumber-js";

// Pure helpers for the /join membership form. They decide what the form
// sends to /api/create-payment-intent — and so what lands in the Members
// table — which is why they live here rather than inside the component.

export interface OtherableSingle {
  selected: string;
  otherText: string;
}

export interface OtherableMulti {
  selected: string[];
  otherText: string;
}

export function resolveMulti(f: OtherableMulti): string {
  const vals = [...f.selected];
  if (vals.includes("Other") && f.otherText.trim()) {
    const idx = vals.indexOf("Other");
    vals[idx] = f.otherText.trim();
  } else {
    const idx = vals.indexOf("Other");
    if (idx !== -1) vals.splice(idx, 1);
  }
  return vals.join(", ").slice(0, 500);
}

export function resolveSingle(f: OtherableSingle): string {
  return (f.selected === "Other" ? f.otherText.trim() : f.selected).slice(
    0,
    500
  );
}

export function reconcileSingle(
  f: OtherableSingle,
  validValues: string[]
): OtherableSingle {
  if (f.selected === "" || f.selected === "Other") return f;
  return validValues.includes(f.selected)
    ? f
    : { selected: "", otherText: "" };
}

export function reconcileMulti(
  f: OtherableMulti,
  validValues: string[]
): OtherableMulti {
  const filtered = f.selected.filter(
    (v) => v === "Other" || validValues.includes(v)
  );
  return { selected: filtered, otherText: f.otherText };
}

export const NANP_COUNTRIES = new Set<Country>([
  "US",
  "CA",
  "AG",
  "AI",
  "AS",
  "BB",
  "BM",
  "BS",
  "DM",
  "DO",
  "GD",
  "GU",
  "JM",
  "KN",
  "KY",
  "LC",
  "MP",
  "MS",
  "PR",
  "SX",
  "TC",
  "TT",
  "VC",
  "VG",
  "VI",
]);

export function formatNationalNumber(digits: string, country: Country): string {
  if (!digits) return "";
  if (NANP_COUNTRIES.has(country)) {
    const d = digits.slice(0, 10);
    if (d.length === 0) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  const formatter = new AsYouType(country);
  return formatter.input(digits) || digits;
}

export function nanpDigitLimit(country: Country): number | null {
  return NANP_COUNTRIES.has(country) ? 10 : null;
}
