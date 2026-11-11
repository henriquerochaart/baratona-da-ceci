import { grava, corpo, validVoter, estado } from "./_store.js";
const txt = (s, n) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");
const num = (x, a, b) => (typeof x === "number" && x >= a && x <= b ? x : null);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { voter, item, nome } = corpo(req);
  if (!validVoter(voter) || !item) return res.status(400).json({ erro: "Sugestão inválida." });
  const novo = {
    id: "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nome: txt(item.nome, 60),
    end: txt(item.end, 90),
    lat: num(item.lat, -23.62, -23.50),
    lon: num(item.lon, -46.76, -46.62),
    at: new Date().toISOString(),
  };
  if (novo.nome.length < 2) return res.status(400).json({ erro: "Escreva o nome do bar." });
  try {
    const { sugestoes } = await estado();
    const antes = Array.isArray(sugestoes[voter]?.itens) ? sugestoes[voter].itens : [];
    await grava("sugestoes", voter, { nome: txt(nome, 40), itens: [...antes, novo].slice(-10) });
    res.status(200).json({ ok: true, item: novo });
  } catch { res.status(500).json({ erro: "Não deu para salvar a sugestão." }); }
}
