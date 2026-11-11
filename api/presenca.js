import { grava, corpo, validVoter } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { voter, nome, vai } = corpo(req);
  const n = typeof nome === "string" ? nome.replace(/\s+/g, " ").trim().slice(0, 40) : "";
  if (!validVoter(voter) || (vai && n.length < 2)) return res.status(400).json({ erro: "Escreva seu nome para confirmar." });
  try { await grava("presenca", voter, { nome: n, vai: !!vai, at: new Date().toISOString() }); res.status(200).json({ ok: true }); }
  catch { res.status(500).json({ erro: "Não deu para salvar sua presença." }); }
}
