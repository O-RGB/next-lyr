const THAI_COMBINING_CHARS = new Set([
  "\u0e31",
  "\u0e34",
  "\u0e35",
  "\u0e36",
  "\u0e37",
  "\u0e38",
  "\u0e39",
  "\u0e47",
  "\u0e48",
  "\u0e49",
  "\u0e4a",
  "\u0e4b",
  "\u0e4c",
  "\u0e4d",
  "\u0e4e",
]);

export interface ThaiCharCluster {
  text: string;
  tick: number;
}

export function groupThaiCharacters(
  text: string,
  ticks: number[]
): ThaiCharCluster[] {
  const chars = text.split("");
  const clusters: ThaiCharCluster[] = [];
  let i = 0;
  while (i < chars.length) {
    const baseChar = chars[i];
    const baseTick = ticks[i] || 0;

    let clusterText = baseChar;
    let j = i + 1;

    if (!"เแโไใำ".includes(baseChar)) {
      while (j < chars.length && THAI_COMBINING_CHARS.has(chars[j])) {
        clusterText += chars[j];
        j += 1;
      }
    }

    clusters.push({ text: clusterText, tick: baseTick });
    i = j;
  }
  return clusters;
}

export function clustersFromText(text: string): { chars: string[] }[] {
  const chars = text.split("");
  const clusters: { chars: string[] }[] = [];
  for (const ch of chars) {
    if (clusters.length === 0 || !THAI_COMBINING_CHARS.has(ch)) {
      clusters.push({ chars: [ch] });
    } else {
      clusters[clusters.length - 1].chars.push(ch);
    }
  }
  return clusters;
}
