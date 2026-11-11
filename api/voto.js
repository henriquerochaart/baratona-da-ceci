import { grava, corpo, validVoter } from "./_store.js";
const ID = /^[a-z0-9_-]{1,40}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { voter, v } = corpo(req);
  if (!validVoter(voter) || !v || typeof v !== "object") return res.status(400).json({ erro: "Voto inválido." });
  const limpo = {};
  for (const [k, x] of Object.entries(v).slice(0, 120)) if (ID.test(k) && (x === 1 || x === -1)) limpo[k] = x;
  try { await grava("votos", voter, { v: limpo, at: new Date().toISOString() }); res.status(200).json({ ok: true }); }
  catch { res.status(500).json({ erro: "Não deu para salvar o voto." }); }
}
