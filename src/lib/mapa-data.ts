export type Afim = { k: number; escala: number; dx: number; dy: number };
export type MapaNordeste = {
  fonte: string;
  largura: number;
  altura: number;
  afim: Afim;
  estados: { uf: string; d: string }[];
  municipios: Record<string, [number, number]>;
};

const UFS = new Set(["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"]);
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
// Só comandos de caminho com números: o texto vai para o atributo d do SVG.
const CAMINHO = /^[MLZ\d.\s-]+$/;

export function lerMapa(bruto: unknown): MapaNordeste | null {
  if (!bruto || typeof bruto !== "object") return null;
  const d = bruto as Record<string, unknown>;
  const a = d["afim"] as Record<string, unknown> | undefined;
  if (
    typeof d["fonte"] !== "string" ||
    !num(d["largura"]) ||
    !num(d["altura"]) ||
    d["largura"] <= 0 ||
    d["altura"] <= 0 ||
    !a ||
    !num(a["k"]) ||
    !num(a["escala"]) ||
    !num(a["dx"]) ||
    !num(a["dy"]) ||
    a["escala"] <= 0 ||
    !Array.isArray(d["estados"]) ||
    d["estados"].length > 20 ||
    !d["municipios"] ||
    typeof d["municipios"] !== "object"
  )
    return null;
  const estados: MapaNordeste["estados"] = [];
  for (const e of d["estados"] as Record<string, unknown>[]) {
    if (
      typeof e?.["uf"] !== "string" ||
      !UFS.has(e["uf"]) ||
      typeof e["d"] !== "string" ||
      e["d"].length > 400_000 ||
      !CAMINHO.test(e["d"]) ||
      estados.some((x) => x.uf === e["uf"])
    )
      return null;
    estados.push({ uf: e["uf"], d: e["d"] });
  }
  const municipios: MapaNordeste["municipios"] = {};
  const entradas = Object.entries(d["municipios"] as Record<string, unknown>);
  if (entradas.length > 2500) return null;
  for (const [cod, v] of entradas) {
    if (
      !/^\d{7}$/.test(cod) ||
      !Array.isArray(v) ||
      v.length !== 2 ||
      !num(v[0]) ||
      !num(v[1]) ||
      Math.abs(v[0]) > 90 ||
      Math.abs(v[1]) > 180
    )
      return null;
    municipios[cod] = [v[0], v[1]];
  }
  return {
    fonte: d["fonte"],
    largura: d["largura"],
    altura: d["altura"],
    afim: { k: a["k"], escala: a["escala"], dx: a["dx"], dy: a["dy"] },
    estados,
    municipios,
  };
}

export const projetar = (f: Afim, lat: number, lon: number) => ({
  x: lon * f.k * f.escala + f.dx,
  y: -lat * f.escala + f.dy,
});

// Distância em linha reta (haversine), em km.
export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (g: number) => (g * Math.PI) / 180;
  const h =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export async function carregarMapa(): Promise<MapaNordeste> {
  const r = await fetch("/data/nordeste-mapa.json", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (!(r.headers.get("content-type") ?? "").includes("json")) throw new Error("Mapa ausente");
  const mapa = lerMapa(await r.json());
  if (!mapa) throw new Error("Arquivo do mapa inválido");
  return mapa;
}
