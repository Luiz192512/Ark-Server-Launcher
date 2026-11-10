/** Original gradients standing in for map artwork, keyed by map id. */
const ART: Record<string, string> = {
  theisland: "linear-gradient(160deg,#0f3d3a,#1d6b5a 55%,#e0a24a)",
  scorchedearth: "linear-gradient(160deg,#3a1a0c,#b5541c 60%,#f2c26a)",
  thecenter: "linear-gradient(160deg,#10243d,#2b6a8f 55%,#9fe0c9)",
  aberration: "linear-gradient(160deg,#1a0c3a,#5a2bb0 55%,#2ee6d6)",
  extinction: "linear-gradient(160deg,#2b2b2b,#6e5a3a 55%,#c9a35a)",
  genesis: "linear-gradient(160deg,#2a0c2a,#a02b7a 55%,#5ad1ff)",
  genesis2: "linear-gradient(160deg,#0c2a2a,#2b8f7a 55%,#e0f0a0)",
  ragnarok: "linear-gradient(160deg,#12304a,#3b7a4a 55%,#cfd8d6)",
  valguero: "linear-gradient(160deg,#2a3a14,#6e8a2a 55%,#e0c36a)",
  crystalisles: "linear-gradient(160deg,#0c2a4a,#2e8fd0 55%,#d9f4ff)",
  lostisland: "linear-gradient(160deg,#2a1a0c,#6a8a3a 55%,#f0d890)",
  fjordur: "linear-gradient(160deg,#10243a,#4a6a8a 55%,#e8f0f8)",
  aquatica: "linear-gradient(160deg,#06222e,#0f6a8a 55%,#5ad1ff)",
};

const FALLBACK = "linear-gradient(160deg,#10242a,#1e3a40 55%,#2ee6d6)";

export function mapArt(id: string): string {
  return ART[id] ?? FALLBACK;
}
