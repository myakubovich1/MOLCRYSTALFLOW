export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "molcrystalflow-theme";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveThemePreference(theme: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") {
    return prefersDark ? "dark" : "light";
  }

  return theme;
}

export function getThemeInitializationScript() {
  return `
    (function () {
      try {
        var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
        var storedTheme = localStorage.getItem(storageKey);
        var theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
        var root = document.documentElement;
        root.dataset.themePreference = theme;
        root.dataset.theme = resolved;
        root.style.colorScheme = resolved;
      } catch (error) {
        document.documentElement.dataset.themePreference = "system";
        document.documentElement.dataset.theme = "dark";
        document.documentElement.style.colorScheme = "dark";
      }
    })();
  `;
}
