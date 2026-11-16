export type DuckLook = {
  body: string;
  wing: string;
  accessory: "none" | "shades" | "partyHat" | "flower";
};

const COLORS: [string, string][] = [
  ["#ffd93b", "#ffbf00"], // classic yellow
  ["#ff8fb1", "#ff5f93"], // pink
  ["#4fd1c5", "#2bb3a8"], // teal
  ["#ffa94d", "#ff8a1f"], // orange
  ["#b197fc", "#8f6cf5"], // purple
  ["#8ce99a", "#4cd964"], // green
  ["#ff7a7a", "#f04a4a"], // red
  ["#74c0fc", "#3fa4f5"], // sky
  ["#f8f9fa", "#dee2e6"], // cream
  ["#d0f25e", "#aedb2a"], // lime
];
const ACCESSORIES: DuckLook["accessory"][] = [
  "none",
  "shades",
  "partyHat",
  "flower",
];

/** A distinct colour/accessory for the nth duck in a race. */
export function duckLook(index: number): DuckLook {
  const [body, wing] = COLORS[index % COLORS.length]!;
  return {
    body,
    wing,
    accessory: ACCESSORIES[(index + Math.floor(index / 4)) % 4]!,
  };
}
