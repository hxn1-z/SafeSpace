// src/context/settings.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const SettingsContext = createContext(null);

const STORAGE_KEY = "ss_settings_v1";

const DEFAULT_SETTINGS = {
  textSize: "md", // sm | md | lg
  accent: "teal", // teal | blue | purple | rose | amber | lime
};

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);

    return {
      textSize:
        parsed?.textSize === "sm" || parsed?.textSize === "lg" ? parsed.textSize : "md",
      accent:
        ["teal", "blue", "purple", "rose", "amber", "lime"].includes(parsed?.accent)
          ? parsed.accent
          : "teal",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyToDom(settings) {
  const root = document.documentElement;
  root.dataset.ssFont = settings.textSize;
  root.dataset.ssAccent = settings.accent;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    return readStoredSettings();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
    applyToDom(settings);
  }, [settings]);

  // apply once on mount (even if settings didn't change)
  useEffect(() => {
    applyToDom(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      textSize: settings.textSize,
      accent: settings.accent,
      setTextSize: (textSize) =>
        setSettings((prev) => ({
          ...prev,
          textSize: textSize === "sm" || textSize === "lg" ? textSize : "md",
        })),
      setAccent: (accent) =>
        setSettings((prev) => ({
          ...prev,
          accent: ["teal", "blue", "purple", "rose", "amber", "lime"].includes(accent)
            ? accent
            : "teal",
        })),
      reset: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    return {
      ...DEFAULT_SETTINGS,
      setTextSize: () => {},
      setAccent: () => {},
      reset: () => {},
    };
  }
  return ctx;
}
