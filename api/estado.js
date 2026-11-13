import { estado, GERAL, validVoter } from "./_store.js";
import { quem, ehAdmin, PRAZO, votacaoAberta, CHECKIN_ABRE, checkinAberto } from "./_auth.js";

export default async function handler(req, res) {
  try {
    const { votos, sugestoes, perfil, checkins, ocultos } = await estado();
    const apagados = Array.isArray(ocultos[GERAL]?.ids) ? ocultos[GERAL].ids : [];
    const eu = validVoter(req.query?.token) ? req.query.token : null;
    const nomeDe = (id) => perfil[id]?.nome || quem(id)?.nome || "";
    const pontos = {};
    let votantes = 0;
    for (const [id, d] of Object.entries(votos)) {
      let algum = false;
      for (const [k, x] of Object.entries(d?.v || {})) if (x === 1 || x === -1) { pontos[k] = (pontos[k] || 0) + x; algum = true; }
      if (algum) votantes++;
    }
    const sug = [];
    for (const [autor, d] of Object.entries(sugestoes)) {
      for (const it of Array.isArray(d?.itens) ? d.itens : [])
        sug.push({ id: it.id, nome: it.nome, end: it.end || "", lat: it.lat ?? null, lon: it.lon ?? null, at: it.at || "", por: nomeDe(autor) });
    }
    sug.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const placar = Object.entries(checkins)
      .filter(([id]) => quem(id))
      .map(([id, d]) => ({ nome: nomeDe(id) || "Convidado", total: Array.isArray(d?.lista) ? d.lista.length : 0, eu: eu === id }))
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total);
    const meu = eu ? {
      nome: nomeDe(eu),
      v: votos[eu]?.v || {},
      checkins: checkins[eu]?.lista || [],
      admin: ehAdmin(eu),
    } : null;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ pontos, votantes, sugestoes: sug, placar, meu, ocultos: apagados,
      prazo: PRAZO, votacaoAberta: votacaoAberta(), checkinAbre: CHECKIN_ABRE, checkinAberto: checkinAberto() });
  } catch (e) {
    res.status(500).json({ erro: "Não deu para carregar agora." });
  }
}
