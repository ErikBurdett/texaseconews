import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  PrivacyPreferencesContext,
  usePrivacyPreferences,
  type OptionalWidgetChoice,
  type PrivacyPreferencesValue,
} from "../lib/privacy-preferences";

const preferenceStorageKey = "texasbusiness-news:optional-widgets";

export function PrivacyPreferencesProvider({ children }: { children: ReactNode }) {
  const [optionalWidgetChoice, setOptionalWidgetChoice] = useState<OptionalWidgetChoice>(readWidgetChoice);
  const [choicesOpen, setChoicesOpen] = useState(() => readWidgetChoice() === "unset");

  const updateChoice = useCallback((choice: Exclude<OptionalWidgetChoice, "unset">) => {
    setOptionalWidgetChoice(choice);
    setChoicesOpen(false);
    try {
      window.localStorage.setItem(preferenceStorageKey, choice);
    } catch {
      // The choice still applies for this page when browser storage is unavailable.
    }
  }, []);

  const value = useMemo<PrivacyPreferencesValue>(() => ({
    optionalWidgetsAllowed: optionalWidgetChoice === "allowed",
    optionalWidgetChoice,
    allowOptionalWidgets: () => updateChoice("allowed"),
    declineOptionalWidgets: () => updateChoice("declined"),
    showPrivacyChoices: () => setChoicesOpen(true),
  }), [optionalWidgetChoice, updateChoice]);

  return (
    <PrivacyPreferencesContext.Provider value={value}>
      {children}
      {choicesOpen ? <PrivacyChoicesNotice /> : null}
    </PrivacyPreferencesContext.Provider>
  );
}

function PrivacyChoicesNotice() {
  const { allowOptionalWidgets, declineOptionalWidgets, optionalWidgetChoice } = usePrivacyPreferences();

  return (
    <section aria-labelledby="privacy-choices-title" className="privacy-choices" role="region">
      <div>
        <p className="eyebrow">Privacy choice</p>
        <h2 id="privacy-choices-title">Optional market widgets are off until you choose.</h2>
        <p>
          LiveCoinWatch and TradingView may receive your IP address, browser details, and page-request data if their
          scripts load. Core news, filters, and sponsor labels work without them. Read the <Link to="/privacy">Privacy Statement</Link>.
        </p>
        {optionalWidgetChoice !== "unset" ? <p className="privacy-current-choice">Current choice: {optionalWidgetChoice}.</p> : null}
      </div>
      <div className="privacy-choice-actions">
        <button className="button" onClick={allowOptionalWidgets} type="button">Allow optional tickers</button>
        <button className="button ghost" onClick={declineOptionalWidgets} type="button">Keep optional tickers off</button>
      </div>
    </section>
  );
}

function readWidgetChoice(): OptionalWidgetChoice {
  try {
    const stored = window.localStorage.getItem(preferenceStorageKey);
    return stored === "allowed" || stored === "declined" ? stored : "unset";
  } catch {
    return "unset";
  }
}
