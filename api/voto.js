import { grava, corpo } from "./_store.js";
import { quem, votacaoAberta } from "./_auth.js";
const ID = /^[a-z0-9_-]{1,40}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { token, v } = corpo(req);
  if (!quem(token)) return res.status(401).json({ erro: "Entre com seu telefone para votar." });
  if (!votacaoAberta()) return res.status(403).json({ erro: "A votação já fechou." });
  if (!v || typeof v !== "object") return res.status(400).json({ erro: "Voto inválido." });
  const limpo = {};
  for (const [k, x] of Object.entries(v).slice(0, 120)) if (ID.test(k) && (x === 1 || x === -1)) limpo[k] = x;
  try { await grava("votos", token, { v: limpo, at: new Date().toISOString() }); res.status(200).json({ ok: true }); }
  catch { res.status(500).json({ erro: "Não deu para salvar o voto." }); }
}
