export const themeColors: {
  primary: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  foreground: { light: string; dark: string };
  muted: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
  studyBackground: { light: string; dark: string };
  studySurface: { light: string; dark: string };
  studyVerseCard: { light: string; dark: string };
  studyDeepDiveCard: { light: string; dark: string };
  studyExplanationCard: { light: string; dark: string };
  studyOriginalCard: { light: string; dark: string };
  studyInk: { light: string; dark: string };
  studyMuted: { light: string; dark: string };
  studyAccent: { light: string; dark: string };
  studyAccentSoft: { light: string; dark: string };
  studyBorder: { light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
