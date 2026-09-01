import { createContext, useContext } from "react";

export type OptionalWidgetChoice = "allowed" | "declined" | "unset";

export type PrivacyPreferencesValue = {
  optionalWidgetsAllowed: boolean;
  optionalWidgetChoice: OptionalWidgetChoice;
  allowOptionalWidgets: () => void;
  declineOptionalWidgets: () => void;
  showPrivacyChoices: () => void;
};

export const PrivacyPreferencesContext = createContext<PrivacyPreferencesValue | null>(null);

export function usePrivacyPreferences() {
  const context = useContext(PrivacyPreferencesContext);
  if (!context) {
    throw new Error("usePrivacyPreferences must be used inside PrivacyPreferencesProvider.");
  }
  return context;
}
