"use client";

import React, { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
  type Country,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import en from "react-phone-number-input/locale/en.json";
import { AsYouType } from "libphonenumber-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

type Step = 1 | 2 | 3;

interface Step1 {
  firstName: string;
  lastName: string;
  psuEmail: string;
  phone: string;
  year: "Freshman" | "Sophomore" | "Junior" | "Senior" | "Grad Student" | "";
}

interface OtherableSingle {
  selected: string;
  otherText: string;
}

interface OtherableMulti {
  selected: string[];
  otherText: string;
}

interface Step2 {
  major: string;
  hometown: string;
  gender: OtherableSingle;
  religion: OtherableMulti;
  identity: OtherableMulti;
  generation: OtherableSingle;
  instagram: string;
}

const IDENTITY_OPTIONS = [
  "Assamese",
  "Bengali",
  "Bihari",
  "Gujarati",
  "Kashmiri",
  "Kannadiga",
  "Konkani",
  "Malayali",
  "Marathi",
  "Odia",
  "Nepali",
  "North India / Hindi Belt",
  "North East (Seven Sisters)",
  "Pashtun",
  "Punjabi",
  "Rajasthani",
  "Santhali",
  "Sindhi",
  "Sinhalese",
  "Tamil",
  "Telugu",
];

const RELIGION_OPTIONS = [
  "Hindu",
  "Muslim",
  "Christian",
  "Buddhist",
  "Jain",
  "Sikh",
  "Parsi",
  "Not Religious",
];

const GENERATION_OPTIONS = [
  "1st generation (born outside the US)",
  "1.5 generation (born abroad, moved to US as a young child)",
  "2nd generation (born in the US)",
  "3rd generation+ (parents born in the US)",
];

function resolveMulti(f: OtherableMulti): string {
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

function resolveSingle(f: OtherableSingle): string {
  return (f.selected === "Other" ? f.otherText.trim() : f.selected).slice(
    0,
    500
  );
}

const NANP_COUNTRIES = new Set<Country>([
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

function formatNationalNumber(digits: string, country: Country): string {
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

function nanpDigitLimit(country: Country): number | null {
  return NANP_COUNTRIES.has(country) ? 10 : null;
}

export default function MembershipForm() {
  const [step, setStep] = useState<Step>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [piLoading, setPiLoading] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<Country>("US");
  const [countryOpen, setCountryOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  useEffect(() => {
    if (!countryOpen) return;
    function onDown(e: MouseEvent) {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(e.target as Node)
      ) {
        setCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [countryOpen]);

  const [step1, setStep1] = useState<Step1>({
    firstName: "",
    lastName: "",
    psuEmail: "",
    phone: "",
    year: "",
  });

  const [step2, setStep2] = useState<Step2>({
    major: "",
    hometown: "",
    gender: { selected: "", otherText: "" },
    religion: { selected: [], otherText: "" },
    identity: { selected: [], otherText: "" },
    generation: { selected: "", otherText: "" },
    instagram: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateStep1(): boolean {
    const next: Record<string, string> = {};

    if (!step1.firstName.trim())
      next.firstName = "First name is required.";

    if (!step1.lastName.trim()) next.lastName = "Last name is required.";

    if (!step1.psuEmail.trim()) {
      next.psuEmail = "PSU email is required.";
    } else if (!/^[^\s@]+@psu\.edu$/i.test(step1.psuEmail.trim())) {
      next.psuEmail = "Email must end in @psu.edu.";
    }

    if (!step1.phone.trim()) {
      next.phone = "Phone number is required.";
    } else if (
      !isValidPhoneNumber(`+${getCountryCallingCode(phoneCountry)}${step1.phone}`)
    ) {
      next.phone = "Please enter a valid phone number.";
    }

    if (!step1.year) {
      next.year = "Please select your year.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2(): boolean {
    const next: Record<string, string> = {};

    if (
      step2.gender.selected === "Other" &&
      !step2.gender.otherText.trim()
    ) {
      next.gender = "Please specify your gender.";
    }

    if (
      step2.religion.selected.includes("Other") &&
      !step2.religion.otherText.trim()
    ) {
      next.religion = "Please specify your religion.";
    }

    if (
      step2.identity.selected.includes("Other") &&
      !step2.identity.otherText.trim()
    ) {
      next.identity = "Please specify your identity.";
    }

    if (
      step2.generation.selected === "Other" &&
      !step2.generation.otherText.trim()
    ) {
      next.generation = "Please specify your generation.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goToStep2() {
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  }

  function goToStep3() {
    if (validateStep2()) {
      setErrors({});
      setSubmitError(null);
      setClientSecret(null);
      setStep(3);
    }
  }

  function goBack() {
    setErrors({});
    setSubmitError(null);
    setStep((s) => (s === 1 ? 1 : (s - 1) as Step));
  }

  useEffect(() => {
    if (step !== 3 || clientSecret) return;

    setPiLoading(true);
    const payload = {
      firstName: step1.firstName,
      lastName: step1.lastName,
      psuEmail: step1.psuEmail,
      phone: `+${getCountryCallingCode(phoneCountry)}${step1.phone}`,
      year: step1.year,
      major: step2.major,
      hometown: step2.hometown,
      gender: resolveSingle(step2.gender),
      religion: resolveMulti(step2.religion),
      identity: resolveMulti(step2.identity),
      generation: resolveSingle(step2.generation),
      instagram: step2.instagram,
    };

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setSubmitError(data.error ?? "Failed to initialize payment");
        }
      })
      .catch(() =>
        setSubmitError("Failed to initialize payment. Please try again.")
      )
      .finally(() => setPiLoading(false));
  }, [step, clientSecret, step1, step2]);


  return (
    <div
      ref={formRef}
      className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
    >
      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-between">
        {[1, 2, 3].map((s, idx) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  step > s
                    ? "bg-sasa-gold-600 text-sasa-red-900"
                    : step === s
                      ? "bg-sasa-red-900 text-white"
                      : "border-2 border-gray-300 text-gray-400"
                }`}
              >
                {step > s ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.293 5.293a1 1 0 011.414 1.414l-10 10a1 1 0 01-1.414 0l-6-6a1 1 0 011.414-1.414L10 14.586l9.293-9.293z" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              <span className="text-xs text-sasa-neutral-500">
                {["Personal Info", "Demographics", "Payment"][idx]}
              </span>
            </div>

            {idx < 2 && (
              <div
                className={`h-0.5 flex-1 mx-2 ${
                  step > s + 1 ? "bg-sasa-gold-600" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <div className="mb-6 rounded-lg border border-sasa-gold-600/30 bg-sasa-gold-400/10 p-4">
            <p className="text-sm leading-relaxed text-sasa-neutral-500">
              Thank you for your interest in joining our community of Desi students here at Penn State. 😊
              <br />
              <br />
              <strong>Benefits of membership include:</strong>
              <br />• Free & discounted cultural & social events
              <br />• Free food & perks (Holi t-shirt, goodie bags, etc.) at specific events
              <br />• Priority tickets to social events & partner org events
              <br />• Access to GroupMe to get latest news/connect with others
              <br />• Eligible to apply for freshman liaison/vacant admin board positions
              <br />
              <br />
              We are so excited to meet and get to know each and everyone of you this year!
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={step1.firstName}
                onChange={(e) =>
                  setStep1((p) => ({ ...p, firstName: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={step1.lastName}
                onChange={(e) =>
                  setStep1((p) => ({ ...p, lastName: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-1">
                PSU Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={step1.psuEmail}
                onChange={(e) =>
                  setStep1((p) => ({ ...p, psuEmail: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
              />
              {errors.psuEmail && (
                <p className="mt-1 text-xs text-red-500">{errors.psuEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative" ref={countryDropdownRef}>
                  <button
                    type="button"
                    aria-label="Country"
                    aria-haspopup="listbox"
                    aria-expanded={countryOpen}
                    onClick={() => setCountryOpen((o) => !o)}
                    className="flex items-center gap-1.5 h-full rounded border border-gray-300 bg-white px-2 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
                  >
                    <span className="inline-block w-6 h-4 overflow-hidden">
                      {flags[phoneCountry]
                        ? React.createElement(flags[phoneCountry]!, {
                            title: en[phoneCountry] ?? phoneCountry,
                          })
                        : null}
                    </span>
                    <span className="text-gray-700">
                      +{getCountryCallingCode(phoneCountry)}
                    </span>
                    <span className="text-gray-400 text-xs">▾</span>
                  </button>
                  {countryOpen && (
                    <ul
                      role="listbox"
                      className="absolute z-10 mt-1 max-h-64 w-72 overflow-auto rounded border border-gray-300 bg-white py-1 text-sm shadow-lg"
                    >
                      {getCountries().map((c) => {
                        const Flag = flags[c];
                        return (
                          <li
                            key={c}
                            role="option"
                            aria-selected={c === phoneCountry}
                            onClick={() => {
                              setPhoneCountry(c);
                              setStep1((p) => ({ ...p, phone: "" }));
                              setCountryOpen(false);
                            }}
                            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-100 ${
                              c === phoneCountry ? "bg-gray-50" : ""
                            }`}
                          >
                            <span className="inline-block w-6 h-4 overflow-hidden flex-shrink-0">
                              {Flag
                                ? React.createElement(Flag, {
                                    title: en[c] ?? c,
                                  })
                                : null}
                            </span>
                            <span className="flex-1 truncate">{en[c] ?? c}</span>
                            <span className="text-gray-500">
                              +{getCountryCallingCode(c)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {(() => {
                  const isNanp = NANP_COUNTRIES.has(phoneCountry);
                  const formatted = formatNationalNumber(
                    step1.phone,
                    phoneCountry
                  );
                  const mask = "(000) 000-0000";
                  const showOverlay =
                    isNanp && formatted.length < mask.length;
                  return (
                    <div className="relative flex-1">
                      {showOverlay && (
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 px-3 py-2 text-sm font-mono flex items-center"
                        >
                          <span className="invisible">{formatted}</span>
                          <span className="text-gray-300">
                            {mask.slice(formatted.length)}
                          </span>
                        </div>
                      )}
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={formatted}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          const limit = nanpDigitLimit(phoneCountry);
                          const capped =
                            limit !== null ? digits.slice(0, limit) : digits;
                          setStep1((p) => ({ ...p, phone: capped }));
                        }}
                        className={`relative w-full rounded border border-gray-300 px-3 py-2 text-sm bg-transparent focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900 ${
                          isNanp ? "font-mono" : ""
                        }`}
                      />
                    </div>
                  );
                })()}
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {["Freshman", "Sophomore", "Junior", "Senior", "Grad Student"].map(
                  (y) => (
                    <label key={y} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="year"
                        value={y}
                        checked={step1.year === y}
                        onChange={(e) =>
                          setStep1((p) => ({
                            ...p,
                            year: e.target.value as Step1["year"],
                          }))
                        }
                        className="accent-sasa-red-900"
                      />
                      <span className="text-sm">{y}</span>
                    </label>
                  )
                )}
              </div>
              {errors.year && (
                <p className="mt-1 text-xs text-red-500">{errors.year}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={goToStep2}
              className="rounded bg-sasa-red-900 px-6 py-2 text-sm font-semibold text-white hover:bg-sasa-red-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          <div className="mb-6">
            <h2 className="font-heading text-lg font-semibold text-sasa-red-900 mb-2">
              Demographic Information
            </h2>
            <p className="text-sm text-sasa-neutral-500">
              These questions are optional but we recommend you fill out so we are able to get to know you and have information about our membership when planning events
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-1">
                What are you studying/what is your major?
              </label>
              <input
                type="text"
                value={step2.major}
                onChange={(e) =>
                  setStep2((p) => ({ ...p, major: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
              />
              {errors.major && (
                <p className="mt-1 text-xs text-red-500">{errors.major}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-1">
                Where is your hometown?
              </label>
              <input
                type="text"
                value={step2.hometown}
                onChange={(e) =>
                  setStep2((p) => ({ ...p, hometown: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
              />
              {errors.hometown && (
                <p className="mt-1 text-xs text-red-500">{errors.hometown}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-2">
                Gender
              </label>
              <div className="space-y-2">
                {["Male", "Female", "Other"].map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={step2.gender.selected === g}
                      onChange={() =>
                        setStep2((p) => ({
                          ...p,
                          gender: { selected: g, otherText: "" },
                        }))
                      }
                      className="accent-sasa-red-900"
                    />
                    <span className="text-sm">{g}</span>
                    {g === "Other" && step2.gender.selected === "Other" && (
                      <input
                        type="text"
                        value={step2.gender.otherText}
                        onChange={(e) =>
                          setStep2((p) => ({
                            ...p,
                            gender: { selected: "Other", otherText: e.target.value },
                          }))
                        }
                        placeholder="Please specify"
                        className="ml-2 rounded border border-gray-300 px-2 py-0.5 text-sm focus:border-sasa-red-900 focus:outline-none"
                        autoFocus
                      />
                    )}
                  </label>
                ))}
              </div>
              {errors.gender && (
                <p className="mt-1 text-xs text-red-500">{errors.gender}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-2">
                What religion do you identify with?
              </label>
              <div className="space-y-2">
                {RELIGION_OPTIONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step2.religion.selected.includes(r)}
                      onChange={(e) => {
                        setStep2((p) => ({
                          ...p,
                          religion: {
                            ...p.religion,
                            selected: e.target.checked
                              ? [...p.religion.selected, r]
                              : p.religion.selected.filter((x) => x !== r),
                          },
                        }));
                      }}
                      className="accent-sasa-red-900"
                    />
                    <span className="text-sm">{r}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step2.religion.selected.includes("Other")}
                    onChange={(e) => {
                      setStep2((p) => ({
                        ...p,
                        religion: {
                          ...p.religion,
                          selected: e.target.checked
                            ? [...p.religion.selected, "Other"]
                            : p.religion.selected.filter((x) => x !== "Other"),
                          otherText: !e.target.checked ? "" : p.religion.otherText,
                        },
                      }));
                    }}
                    className="accent-sasa-red-900"
                  />
                  <span className="text-sm">Other:</span>
                  {step2.religion.selected.includes("Other") && (
                    <input
                      type="text"
                      value={step2.religion.otherText}
                      onChange={(e) =>
                        setStep2((p) => ({
                          ...p,
                          religion: { ...p.religion, otherText: e.target.value },
                        }))
                      }
                      placeholder="Please specify"
                      className="ml-2 rounded border border-gray-300 px-2 py-0.5 text-sm focus:border-sasa-red-900 focus:outline-none"
                      autoFocus
                    />
                  )}
                </label>
              </div>
              {errors.religion && (
                <p className="mt-1 text-xs text-red-500">{errors.religion}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-2">
                Which of the following identities do you identify with?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {IDENTITY_OPTIONS.map((id) => (
                  <label key={id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step2.identity.selected.includes(id)}
                      onChange={(e) => {
                        setStep2((p) => ({
                          ...p,
                          identity: {
                            ...p.identity,
                            selected: e.target.checked
                              ? [...p.identity.selected, id]
                              : p.identity.selected.filter((x) => x !== id),
                          },
                        }));
                      }}
                      className="accent-sasa-red-900"
                    />
                    <span className="text-sm">{id}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={step2.identity.selected.includes("Other")}
                    onChange={(e) => {
                      setStep2((p) => ({
                        ...p,
                        identity: {
                          ...p.identity,
                          selected: e.target.checked
                            ? [...p.identity.selected, "Other"]
                            : p.identity.selected.filter((x) => x !== "Other"),
                          otherText: !e.target.checked ? "" : p.identity.otherText,
                        },
                      }));
                    }}
                    className="accent-sasa-red-900"
                  />
                  <span className="text-sm">Other:</span>
                  {step2.identity.selected.includes("Other") && (
                    <input
                      type="text"
                      value={step2.identity.otherText}
                      onChange={(e) =>
                        setStep2((p) => ({
                          ...p,
                          identity: { ...p.identity, otherText: e.target.value },
                        }))
                      }
                      placeholder="Please specify"
                      className="ml-2 rounded border border-gray-300 px-2 py-0.5 text-sm focus:border-sasa-red-900 focus:outline-none"
                      autoFocus
                    />
                  )}
                </label>
              </div>
              {errors.identity && (
                <p className="mt-1 text-xs text-red-500">{errors.identity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-2">
                Which generation do you identify with?
              </label>
              <div className="space-y-2">
                {GENERATION_OPTIONS.map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="generation"
                      value={g}
                      checked={step2.generation.selected === g}
                      onChange={() =>
                        setStep2((p) => ({
                          ...p,
                          generation: { selected: g, otherText: "" },
                        }))
                      }
                      className="accent-sasa-red-900"
                    />
                    <span className="text-sm">{g}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="generation"
                    value="Other"
                    checked={step2.generation.selected === "Other"}
                    onChange={() =>
                      setStep2((p) => ({
                        ...p,
                        generation: { selected: "Other", otherText: "" },
                      }))
                    }
                    className="accent-sasa-red-900"
                  />
                  <span className="text-sm">Other:</span>
                  {step2.generation.selected === "Other" && (
                    <input
                      type="text"
                      value={step2.generation.otherText}
                      onChange={(e) =>
                        setStep2((p) => ({
                          ...p,
                          generation: { selected: "Other", otherText: e.target.value },
                        }))
                      }
                      placeholder="Please specify"
                      className="ml-2 rounded border border-gray-300 px-2 py-0.5 text-sm focus:border-sasa-red-900 focus:outline-none"
                      autoFocus
                    />
                  )}
                </label>
              </div>
              {errors.generation && (
                <p className="mt-1 text-xs text-red-500">{errors.generation}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-sasa-red-900 mb-1">
                What is your Instagram handle?
              </label>
              <input
                type="text"
                value={step2.instagram}
                onChange={(e) =>
                  setStep2((p) => ({ ...p, instagram: e.target.value }))
                }
                placeholder="@yourhandle"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
              />
              {errors.instagram && (
                <p className="mt-1 text-xs text-red-500">{errors.instagram}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between gap-3">
            <button
              onClick={goBack}
              className="rounded border-2 border-sasa-gold-400 px-6 py-2 text-sm font-semibold text-sasa-gold-400 hover:bg-sasa-gold-400/10 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goToStep3}
              className="rounded bg-sasa-red-900 px-6 py-2 text-sm font-semibold text-white hover:bg-sasa-red-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <div className="mb-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm text-sasa-neutral-500 mb-1">Order Summary</p>
            <div className="flex justify-between items-baseline">
              <span className="text-base font-semibold text-sasa-red-900">
                SASA Membership
              </span>
              <span className="text-2xl font-bold text-sasa-gold-600">
                $0.50
              </span>
            </div>
          </div>

          {submitError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {piLoading && (
            <p className="text-sm text-sasa-neutral-500 mb-4">
              Loading payment form...
            </p>
          )}

          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <CheckoutForm />
            </Elements>
          )}

          <div className="mt-6">
            <button
              onClick={goBack}
              disabled={piLoading}
              className="rounded border-2 border-sasa-gold-400 px-6 py-2 text-sm font-semibold text-sasa-gold-400 hover:bg-sasa-gold-400/10 disabled:opacity-60 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/join/return`,
      },
    });

    if (error) {
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="mt-6 w-full rounded bg-sasa-red-900 px-6 py-3 text-sm font-semibold text-white hover:bg-sasa-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Processing..." : "Become a Member!"}
      </button>
    </form>
  );
}
