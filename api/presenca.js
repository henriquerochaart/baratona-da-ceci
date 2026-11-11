import { grava, corpo } from "./_store.js";
import { quem } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { token, vai } = corpo(req);
  if (!quem(token)) return res.status(401).json({ erro: "Entre com seu telefone para confirmar." });
  try { await grava("presenca", token, { vai: !!vai, at: new Date().toISOString() }); res.status(200).json({ ok: true }); }
  catch { res.status(500).json({ erro: "Não deu para salvar sua presença." }); }
}
