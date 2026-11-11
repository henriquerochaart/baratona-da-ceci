import { entrar } from "./_auth.js";
import { corpo, estado } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const { telefone } = corpo(req);
  const c = entrar(telefone);
  if (!c) return res.status(404).json({ erro: "Esse telefone não está na lista de convidados. Confira o número ou fale com a Ceci." });
  let nome = c.nome;
  try { const { perfil } = await estado(); if (perfil[c.token]?.nome) nome = perfil[c.token].nome; } catch {}
  res.status(200).json({ token: c.token, nome });
}
