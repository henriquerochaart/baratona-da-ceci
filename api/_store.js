import { neon } from "@neondatabase/serverless";

// Tudo fica numa tabela só do Postgres (Neon): uma linha por coleção + pessoa.
// Coleções: votos, sugestoes, perfil, checkins e ocultos ("ocultos" é uma linha só, dos admins, em GERAL).
// Antes era Vercel Blob, mas cada leitura listava arquivos e a cota gratuita estourou em 13/11.
export const COLECOES = ["votos", "sugestoes", "perfil", "checkins", "ocultos"];
export const GERAL = "0".repeat(32);
const VOTER = /^[a-f0-9]{32}$/;
export const validVoter = (v) => typeof v === "string" && VOTER.test(v);

const URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const sql = URL ? neon(URL) : null;
let pronto = null;

function banco() {
  if (!sql) throw new Error("Banco não configurado (DATABASE_URL).");
  if (!pronto) {
    pronto = sql.query(`create table if not exists baratona_dados (
      colecao text not null, voter text not null, dados jsonb not null,
      at timestamptz not null default now(), primary key (colecao, voter))`).catch((e) => { pronto = null; throw e; });
  }
  return pronto;
}

export async function grava(colecao, voter, dados) {
  if (!COLECOES.includes(colecao) || !validVoter(voter)) throw new Error("Gravação inválida.");
  await banco();
  await sql.query(
    `insert into baratona_dados (colecao, voter, dados, at) values ($1, $2, $3::jsonb, now())
     on conflict (colecao, voter) do update set dados = excluded.dados, at = now()`,
    [colecao, voter, JSON.stringify(dados)],
  );
  cache = null;
}

let cache = null;
export async function estado() {
  if (cache && Date.now() - cache.t < 3000) return cache.v;
  await banco();
  const linhas = await sql.query("select colecao, voter, dados from baratona_dados");
  const v = Object.fromEntries(COLECOES.map((c) => [c, {}]));
  for (const l of linhas) if (v[l.colecao] && validVoter(l.voter)) v[l.colecao][l.voter] = l.dados;
  cache = { t: Date.now(), v };
  return v;
}

export function corpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}
