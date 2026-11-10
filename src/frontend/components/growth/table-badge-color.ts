const mutedHues = [214, 353, 168, 263, 29, 188, 68, 306, 229, 12, 145, 245];

export function tableBadgeColor(column: "industry" | "region" | "seller", value: string) {
  let hash = 2166136261;
  for (const char of `${column}:${value.trim()}`) {
    hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619);
  }
  const seed = hash >>> 0;
  const hue = mutedHues[seed % mutedHues.length] + (((seed >>> 8) % 81) - 40) / 10;
  const saturation = 34 + ((seed >>> 12) % 10);
  const lightness = 86 + ((seed >>> 17) % 49) / 10;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}
