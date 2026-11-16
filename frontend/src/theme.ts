import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Sampled from the logo: a friendly periwinkle blue.
const frum: MantineColorsTuple = [
  "#e8f1ff",
  "#cfe1ff",
  "#9fc4ff",
  "#6ba4ff",
  "#4690ff",
  "#2f7fff",
  "#1f6df2",
  "#1559d6",
  "#0f47b0",
  "#0a3585",
];

// Dark mode: a saturated indigo instead of neutral grey. [7] is the page,
// [6] is cards and inputs.
const dark: MantineColorsTuple = [
  "#e4e8ff",
  "#b9c2f2",
  "#8f9bdc",
  "#6a77c2",
  "#4a56a5",
  "#37428c",
  "#2b3478",
  "#1f2763",
  "#171d4f",
  "#0e1238",
];

export const theme = createTheme({
  primaryColor: "frum",
  colors: { frum, dark },
  primaryShade: { light: 6, dark: 4 },
  defaultRadius: "md",
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily:
      '"Bricolage Grotesque", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: "800",
  },
  components: {
    Card: { defaultProps: { radius: "lg", withBorder: true } },
    Button: { defaultProps: { radius: "xl", fw: 600 } },
    Modal: { defaultProps: { radius: "lg" } },
    Popover: { defaultProps: { radius: "md", shadow: "lg" } },
  },
});
