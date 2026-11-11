import { estado, validVoter } from "./_store.js";

export default async function handler(req, res) {
  try {
    const { votos, sugestoes, presenca } = await estado();
    const voter = validVoter(req.query?.voter) ? req.query.voter : null;
    const pontos = {};
    let votantes = 0;
    for (const d of Object.values(votos)) {
      let algum = false;
      for (const [k, x] of Object.entries(d?.v || {})) if (x === 1 || x === -1) { pontos[k] = (pontos[k] || 0) + x; algum = true; }
      if (algum) votantes++;
    }
    const sug = [];
    for (const [autor, d] of Object.entries(sugestoes)) {
      for (const it of Array.isArray(d?.itens) ? d.itens : []) {
        sug.push({ id: it.id, nome: it.nome, end: it.end || "", lat: it.lat ?? null, lon: it.lon ?? null, at: it.at || "", por: d.nome || "", meu: autor === voter });
      }
    }
    sug.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const confirmados = Object.entries(presenca)
      .filter(([, d]) => d?.vai === true && d?.nome)
      .map(([id, d]) => ({ nome: d.nome, at: d.at || "", eu: id === voter }))
      .sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const meu = voter ? {
      v: votos[voter]?.v || {},
      vai: presenca[voter]?.vai === true,
      nome: presenca[voter]?.nome || sugestoes[voter]?.nome || "",
      sugestoes: sugestoes[voter]?.itens || [],
    } : null;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ pontos, votantes, sugestoes: sug, confirmados: confirmados.map(({ nome, eu }) => ({ nome, eu })), meu });
  } catch (e) {
    res.status(500).json({ erro: "Não deu para carregar agora." });
  }
}
