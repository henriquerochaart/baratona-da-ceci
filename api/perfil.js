import { quem } from "./_auth.js";
import { corpo, grava } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { token, nome } = corpo(req);
  const c = quem(token);
  if (!c) return res.status(401).json({ erro: "Entre de novo com seu telefone." });
  const n = typeof nome === "string" ? nome.replace(/\s+/g, " ").trim().slice(0, 40) : "";
  if (n.length < 2) return res.status(400).json({ erro: "Escreva seu nome." });
  try { await grava("perfil", token, { nome: n, at: new Date().toISOString() }); res.status(200).json({ ok: true, nome: n }); }
  catch { res.status(500).json({ erro: "Não deu para salvar seu nome." }); }
}
