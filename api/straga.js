import { createHash } from "node:crypto";
import { corpo, validVoter, gravaStraga, apagaStraga, listaStraga } from "./_store.js";

/* Straga em turma. POST grava o seu nome, números e (se você deixou) a posição; GET devolve a turma.
   A posição só aparece enquanto a pessoa está gravando e some 30 min depois da última atualização. */
const POS_VALE = 30 * 60; // s
const cod = (id) => createHash("sha256").update("straga:" + id).digest("hex").slice(0, 10);
const num = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const limpaNome = (n) => String(n || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);

async function turma() {
  const linhas = await listaStraga();
  return linhas.map((l) => {
    const d = l.dados || {};
    const ao = d.pos && d.partilha && d.status === "rodando" && l.idade <= POS_VALE;
    return { cod: cod(l.voter), nome: d.nome, bares: d.bares || 0, drinks: d.drinks || 0, metros: d.metros || 0, conq: d.conq || 0,
      status: d.status || "parado", ha: l.idade, pos: ao ? d.pos : null };
  }).filter((p) => p.nome);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") return res.status(200).json({ turma: await turma() });
    if (req.method !== "POST") return res.status(405).json({ erro: "Use GET ou POST." });
    const b = corpo(req);
    if (!validVoter(b.id)) return res.status(400).json({ erro: "Sem identificação." });
    if (b.sair) { await apagaStraga(b.id); return res.status(200).json({ turma: await turma(), eu: cod(b.id) }); }
    const nome = limpaNome(b.nome);
    if (!nome) return res.status(400).json({ erro: "Escreva seu nome." });
    let pos = null;
    if (Array.isArray(b.pos) && b.pos.length === 2) {
      const [lon, lat] = b.pos.map(Number);
      if (lon > -47 && lon < -46 && lat > -24 && lat < -23) pos = [+lon.toFixed(4), +lat.toFixed(4)]; // ~10 m, só São Paulo
    }
    const status = ["parado", "rodando", "pausado", "fim"].includes(b.status) ? b.status : "parado";
    await gravaStraga(b.id, { nome, pos, partilha: !!b.partilha, status,
      bares: num(b.bares, 40), drinks: num(b.drinks, 99), metros: num(b.metros, 60000), conq: num(b.conq, 30) });
    res.status(200).json({ turma: await turma(), eu: cod(b.id) });
  } catch { res.status(500).json({ erro: "Não deu para falar com a turma agora." }); }
}
