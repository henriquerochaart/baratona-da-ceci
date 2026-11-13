import { grava, corpo, estado, GERAL } from "./_store.js";
import { quem, ehAdmin } from "./_auth.js";
const ID = /^[a-z0-9_-]{1,40}$/i;

// Apagar esconde o bar da lista, do mapa e do check-in; restaurar traz de volta com os votos.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { token, acao, id } = corpo(req);
  if (!ehAdmin(token)) return res.status(403).json({ erro: "Só a Ceci e o Henrique podem apagar bares." });
  if (!ID.test(id || "") || (acao !== "apagar" && acao !== "restaurar")) return res.status(400).json({ erro: "Pedido inválido." });
  try {
    const { ocultos } = await estado();
    const ids = new Set(Array.isArray(ocultos[GERAL]?.ids) ? ocultos[GERAL].ids : []);
    if (acao === "apagar") ids.add(id); else ids.delete(id);
    const lista = [...ids];
    await grava("ocultos", GERAL, { ids: lista, at: new Date().toISOString(), por: quem(token)?.nome || "" });
    res.status(200).json({ ok: true, ocultos: lista });
  } catch { res.status(500).json({ erro: "Não deu para salvar agora." }); }
}
