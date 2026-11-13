import { createHmac } from "node:crypto";

// Telefone → chave: DDD + últimos 8 dígitos (aceita com/sem 55, com/sem o 9 extra).
export function chave(tel) {
  let d = String(tel || "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  d = d.replace(/^0+/, "");
  if (d.length < 10 || d.length > 11) return null;
  return d.slice(0, 2) + d.slice(-8);
}

let lista = null;
function convidados() {
  if (lista) return lista;
  let bruto = [];
  try { bruto = JSON.parse(process.env.CONVIDADOS || "[]"); } catch {}
  const segredo = process.env.SEGREDO || "";
  lista = new Map();
  for (const c of bruto) {
    const k = chave(c.t);
    if (!k) continue;
    const token = createHmac("sha256", segredo).update(k).digest("hex").slice(0, 32);
    lista.set(token, { chave: k, nome: (c.n || "").trim() });
  }
  return lista;
}

export function entrar(tel) {
  const k = chave(tel);
  if (!k) return null;
  for (const [token, c] of convidados()) if (c.chave === k) return { token, nome: c.nome };
  return null;
}

export function quem(token) {
  if (typeof token !== "string") return null;
  const c = convidados().get(token);
  return c ? { token, nome: c.nome } : null;
}

// Votação até quarta 18/11/2026, 23:59 em São Paulo.
export const PRAZO = "2026-11-18T23:59:59-03:00";
export const votacaoAberta = () => Date.now() <= Date.parse(PRAZO);

// Check-in: dia 28/11 (das 10h às 6h do dia 29), ou sempre se CHECKIN_LIBERADO=1.
export const CHECKIN_ABRE = "2026-11-28T10:00:00-03:00";
export const checkinAberto = () =>
  process.env.CHECKIN_LIBERADO === "1" ||
  (Date.now() >= Date.parse(CHECKIN_ABRE) && Date.now() <= Date.parse("2026-11-29T06:00:00-03:00"));
