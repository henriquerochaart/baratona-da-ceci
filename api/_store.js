import { put, list, del } from "@vercel/blob";

// Cada pessoa grava seus próprios arquivos: votos/<voter>/..., sugestoes/<voter>/..., presenca/<voter>/...
// O arquivo mais recente de cada pessoa vale; os antigos são apagados na leitura.
export const COLECOES = ["votos", "sugestoes", "presenca", "perfil", "checkins"];
const VOTER = /^[a-f0-9]{32}$/;
export const validVoter = (v) => typeof v === "string" && VOTER.test(v);

export async function grava(colecao, voter, dados) {
  await put(`${colecao}/${voter}/d.json`, JSON.stringify(dados), {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/json",
    cacheControlMaxAge: 31536000,
  });
  cache = null;
}

async function listaTudo(prefix) {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function leColecao(colecao) {
  const blobs = await listaTudo(colecao + "/");
  const porVoter = new Map();
  const velhos = [];
  for (const b of blobs) {
    const voter = b.pathname.split("/")[1];
    if (!validVoter(voter)) continue;
    const atual = porVoter.get(voter);
    if (!atual) porVoter.set(voter, b);
    else if (new Date(b.uploadedAt) > new Date(atual.uploadedAt)) { velhos.push(atual.url); porVoter.set(voter, b); }
    else velhos.push(b.url);
  }
  if (velhos.length) del(velhos).catch(() => {});
  const out = {};
  await Promise.all([...porVoter].map(async ([voter, b]) => {
    try { const r = await fetch(b.url); if (r.ok) out[voter] = await r.json(); } catch {}
  }));
  return out;
}

let cache = null;
export async function estado() {
  if (cache && Date.now() - cache.t < 4000) return cache.v;
  const [votos, sugestoes, presenca, perfil, checkins] = await Promise.all(COLECOES.map(leColecao));
  const v = { votos, sugestoes, presenca, perfil, checkins };
  cache = { t: Date.now(), v };
  return v;
}

export function corpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}
