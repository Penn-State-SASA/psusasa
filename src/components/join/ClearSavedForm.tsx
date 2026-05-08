"use client";

import { useEffect } from "react";

const STORAGE_KEY = "sasa-membership-form-v1";

export default function ClearSavedForm() {
  useEffect(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);
  return null;
}
