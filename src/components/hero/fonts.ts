import { Fraunces } from "next/font/google";

/** Display serif for the landing. Scoped to the hero tree via its CSS variable. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});
