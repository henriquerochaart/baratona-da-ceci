import { grava, corpo, estado } from "./_store.js";
import { quem, checkinAberto } from "./_auth.js";
const ID = /^[a-z0-9_-]{1,40}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { token, bar, barNome } = corpo(req);
  if (!quem(token)) return res.status(401).json({ erro: "Entre com seu telefone para fazer check-in." });
  if (!checkinAberto()) return res.status(403).json({ erro: "O check-in abre no dia 28/11." });
  if (!ID.test(bar || "")) return res.status(400).json({ erro: "Escolha o bar." });
  try {
    const { checkins } = await estado();
    const lista = Array.isArray(checkins[token]?.lista) ? checkins[token].lista : [];
    if (lista.some((c) => c.bar === bar)) return res.status(200).json({ ok: true, repetido: true, total: lista.length });
    const nova = [...lista, { bar, nome: String(barNome || "").slice(0, 60), at: new Date().toISOString() }].slice(-60);
    await grava("checkins", token, { lista: nova });
    res.status(200).json({ ok: true, total: nova.length });
  } catch { res.status(500).json({ erro: "Não deu para salvar o check-in." }); }
}
