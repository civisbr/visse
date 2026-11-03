import { mkdir, writeFile } from "node:fs/promises";
import { lerMapa } from "../../src/lib/mapa-data";

// Geometria estática: roda à mão quando o IBGE revisar a malha, não faz parte do workflow semanal.
const BASE = "https://servicodados.ibge.gov.br/api/v3/malhas";
const FORMATO = "formato=application/vnd.geo+json&qualidade=minima";
const UFS: Record<string, string> = {
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
};
const LARGURA = 900;
const MARGEM = 16;

type Anel = [number, number][];
type Feature = {
  properties: { codarea: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

async function geojson(url: string): Promise<Feature[]> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const f = ((await r.json()) as { features?: Feature[] }).features;
      if (
        !Array.isArray(f) ||
        f.some((x) => !/^\d{2}$|^\d{7}$/.test(String(x?.properties?.codarea)))
      )
        throw new Error("malha inesperada");
      return f;
    } catch (e) {
      if (i >= 4) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
}

const aneis = (f: Feature): Anel[] =>
  (f.geometry.type === "Polygon"
    ? [f.geometry.coordinates as number[][][]]
    : (f.geometry.coordinates as number[][][][])
  ).map((p) => p[0] as Anel);

function centroide(anel: Anel): [number, number] {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < anel.length; i++) {
    const [x0, y0] = anel[i]!;
    const [x1, y1] = anel[(i + 1) % anel.length]!;
    const c = x0 * y1 - x1 * y0;
    area += c;
    cx += (x0 + x1) * c;
    cy += (y0 + y1) * c;
  }
  area /= 2;
  return area === 0 ? anel[0]! : [cx / (6 * area), cy / (6 * area)];
}

const estados = await geojson(`${BASE}/regioes/2?intrarregiao=UF&${FORMATO}`);
const todos = estados.flatMap(aneis).flat();
const lons = todos.map((p) => p[0]);
const lats = todos.map((p) => p[1]);
const menor = (v: number[]) => v.reduce((a, b) => Math.min(a, b), Infinity);
const maior = (v: number[]) => v.reduce((a, b) => Math.max(a, b), -Infinity);
const lat0 = (menor(lats) + maior(lats)) / 2;
const k = Math.cos((lat0 * Math.PI) / 180);
const minX = menor(lons) * k;
const maxX = maior(lons) * k;
const minY = -maior(lats);
const maxY = -menor(lats);
const escala = (LARGURA - 2 * MARGEM) / (maxX - minX);
const altura = Math.round((maxY - minY) * escala + 2 * MARGEM);
const dx = MARGEM - minX * escala;
const dy = MARGEM - minY * escala;
const px = ([lon, lat]: [number, number]) =>
  `${(lon * k * escala + dx).toFixed(1)} ${(-lat * escala + dy).toFixed(1)}`;

const saidaEstados = estados.map((f) => ({
  uf: UFS[f.properties.codarea] ?? f.properties.codarea,
  d: aneis(f)
    .map((a) => "M" + a.map((p) => px(p as [number, number])).join("L") + "Z")
    .join(""),
}));

const municipios: Record<string, [number, number]> = {};
for (const cod of Object.keys(UFS)) {
  for (const f of await geojson(`${BASE}/estados/${cod}?intrarregiao=municipio&${FORMATO}`)) {
    const maior = aneis(f).sort((a, b) => b.length - a.length)[0]!;
    const [lon, lat] = centroide(maior);
    municipios[f.properties.codarea] = [Number(lat.toFixed(4)), Number(lon.toFixed(4))];
  }
}
if (Object.keys(municipios).length < 1700) throw new Error("Malha de municípios incompleta");

const saida = {
  fonte: "IBGE, malhas territoriais (servicodados.ibge.gov.br/api/v3/malhas)",
  geradoEm: new Date().toISOString().slice(0, 10),
  qualidade: "minima",
  largura: LARGURA,
  altura,
  afim: { k, escala, dx, dy },
  estados: saidaEstados,
  municipios,
};
// O front rejeita arquivo fora do formato; melhor falhar aqui do que descobrir no navegador.
if (!lerMapa(saida)) throw new Error("Arquivo gerado não passa na validação do front");
await mkdir("public/data", { recursive: true });
await writeFile("public/data/nordeste-mapa.json", JSON.stringify(saida) + "\n");
console.log(`${Object.keys(municipios).length} municípios, ${saidaEstados.length} estados`);
