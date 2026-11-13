const $ = (id) => document.getElementById(id);
let pontos = {}, sugestoes = [], ocultos = new Set(), meus = [], placar = [], aberto = false, abre = "2026-11-28T10:00:00-03:00", escolhido = null, enviando = false, carregou = false;

// inclusiveApagados: só para achar a foto de um check-in antigo num bar que os admins tiraram depois.
function todos(inclusiveApagados) {
  const vistos = new Set(BARES.map((b) => norm(b.nome))), extra = [];
  sugestoes.forEach((s) => { const k = norm(s.nome); if (!k || vistos.has(k)) return; vistos.add(k); extra.push(s); });
  return [...BARES, ...extra].filter((b) => inclusiveApagados || !ocultos.has(b.id))
    .sort((a, b) => (pontos[b.id] || 0) - (pontos[a.id] || 0) || a.nome.localeCompare(b.nome, "pt"));
}
const feitoSet = () => new Set(meus.map((c) => c.bar));
const fotoDe = (id) => (todos(true).find((b) => b.id === id) || {}).foto || "";

async function carrega() {
  try {
    const j = await api("/api/estado?token=" + encodeURIComponent(Sessao.token));
    pontos = j.pontos || {}; sugestoes = j.sugestoes || []; placar = j.placar || []; ocultos = new Set(j.ocultos || []);
    aberto = !!j.checkinAberto; abre = j.checkinAbre || abre;
    meus = (j.meu && j.meu.checkins) || [];
    if (j.meu && j.meu.nome && j.meu.nome !== Sessao.nome) { Sessao.nomeAtual(j.meu.nome); login.desenha(); }
    carregou = true; desenha();
  } catch { $("ck-estado").textContent = "Não deu para carregar agora. Tente de novo em instantes."; }
}

function desenha() {
  const feitos = feitoSet(), lista = todos();
  if (!escolhido || !lista.some((b) => b.id === escolhido)) escolhido = (lista.find((b) => !feitos.has(b.id)) || lista[0]).id;
  // carrossel de bares
  const box = $("escolha"); box.textContent = "";
  lista.forEach((b) => {
    const bt = document.createElement("button"); bt.type = "button";
    bt.setAttribute("aria-pressed", String(b.id === escolhido)); if (feitos.has(b.id)) bt.classList.add("feito");
    const f = document.createElement("span"); f.className = "f";
    if (b.foto) f.style.backgroundImage = `url("${b.foto}")`; else f.textContent = inicial(b.nome);
    bt.append(f, (feitos.has(b.id) ? "✓ " : "") + b.nome);
    bt.onclick = () => { escolhido = b.id; reseta(); desenha(); };
    box.append(bt);
  });
  // bar escolhido
  const b = lista.find((x) => x.id === escolhido);
  const alvo = $("alvo"); alvo.textContent = "";
  const f = document.createElement("span"); f.className = "f";
  if (b.foto) f.style.backgroundImage = `url("${b.foto}")`; else f.textContent = inicial(b.nome);
  const t = document.createElement("div"); const nb = document.createElement("b"); nb.textContent = b.nome; const ne = document.createElement("span"); ne.textContent = b.end || "";
  t.append(nb, ne); alvo.append(f, t);
  // estado do trilho
  const dentro = !!(Sessao.token && Sessao.nome), ja = feitos.has(b.id);
  const tr = $("trilho"); tr.classList.toggle("off", !aberto || !dentro || ja); tr.classList.toggle("ok", ja);
  $("texto-trilho").textContent = !dentro ? "Entre com seu telefone primeiro" :
    !aberto ? "O check-in abre no dia 28/11, às 10h" : ja ? "✓ Check-in feito aqui" : "Deslize pra fazer check-in";
  $("ck-estado").textContent = aberto ? "Em qual bar você está?" : "Dá pra conhecer os bares. O check-in libera no dia da Baratona.";
  // meus bares
  const n = meus.length;
  $("meu-total").textContent = !dentro ? "Entre com seu telefone para ver seus bares." : n ? `Você já passou por ${n} de 26 bares.` : "Nenhum check-in ainda.";
  const ul = $("carimbos"); ul.textContent = "";
  meus.forEach((c) => {
    const li = document.createElement("li"); const s = document.createElement("span"); s.className = "f";
    const foto = fotoDe(c.bar); if (foto) s.style.backgroundImage = `url("${foto}")`; else s.textContent = inicial(c.nome);
    li.append(s, c.nome || ""); ul.append(li);
  });
  // placar
  const ol = $("placar"); ol.textContent = "";
  if (!placar.length) { const li = document.createElement("li"); li.textContent = carregou ? "Ninguém fez check-in ainda." : "Carregando…"; ol.append(li); }
  placar.slice(0, 30).forEach((p, i) => {
    const li = document.createElement("li"); if (p.eu) li.className = "eu";
    const nm = document.createElement("span"); nm.textContent = `${i + 1}. ${p.nome}${p.eu ? " (você)" : ""}`;
    const bt = document.createElement("b"); bt.textContent = p.total + (p.total === 1 ? " bar" : " bares");
    li.append(nm, bt); ol.append(li);
  });
}

/* ---------- trilho de deslizar ---------- */
const trilho = $("trilho"), bola = $("bola"), preenche = $("preenche");
let arrastando = false, inicioX = 0, posX = 0;
const maxX = () => trilho.clientWidth - bola.offsetWidth - 10;
function poe(x) { posX = Math.max(0, Math.min(maxX(), x)); bola.style.transform = `translateX(${posX}px)`; preenche.style.width = posX + 33 + "px"; bola.setAttribute("aria-valuenow", Math.round((posX / maxX()) * 100)); }
function reseta() { bola.style.transition = "transform .25s ease"; preenche.style.transition = "width .25s ease"; poe(0); setTimeout(() => { bola.style.transition = ""; preenche.style.transition = ""; }, 260); }
const podeDeslizar = () => !trilho.classList.contains("off") && !enviando;
bola.addEventListener("pointerdown", (e) => {
  if (!podeDeslizar()) { if (!(Sessao.token && Sessao.nome)) precisaLogin("fazer check-in"); return; }
  arrastando = true; inicioX = e.clientX - posX; bola.setPointerCapture(e.pointerId); bola.style.cursor = "grabbing";
});
bola.addEventListener("pointermove", (e) => { if (arrastando) poe(e.clientX - inicioX); });
const solta = () => {
  if (!arrastando) return; arrastando = false; bola.style.cursor = "";
  if (posX >= maxX() * 0.9) { poe(maxX()); confirma(); } else reseta();
};
bola.addEventListener("pointerup", solta); bola.addEventListener("pointercancel", solta);
bola.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === "ArrowRight") && podeDeslizar()) { e.preventDefault(); poe(maxX()); confirma(); }
});

async function confirma() {
  enviando = true; $("aviso").hidden = true;
  const b = todos().find((x) => x.id === escolhido);
  try {
    const j = await api("/api/checkin", { bar: b.id, barNome: b.nome });
    if (!j.repetido) meus.push({ bar: b.id, nome: b.nome, at: new Date().toISOString() });
    $("feito").textContent = `Check-in no ${b.nome}! ${j.total} de 26 🍻`;
    festa();
    enviando = false; carrega();
  } catch (e) {
    $("aviso").textContent = e.message; $("aviso").hidden = false; enviando = false; reseta();
  }
}
function festa() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = $("estouro"); box.textContent = "";
  const artes = ["estrela-laranja", "estrela-rosa", "estrela-dourada", "coracao-rosa", "estrela-roxa"];
  for (let i = 0; i < 16; i++) {
    const im = document.createElement("img"); im.src = `/arte/${artes[i % artes.length]}.webp`; im.alt = "";
    im.style.left = Math.random() * 90 + "%"; im.style.top = 70 + Math.random() * 25 + "%"; im.style.animationDelay = Math.random() * 0.4 + "s";
    box.append(im);
  }
  setTimeout(() => (box.textContent = ""), 2400);
}

const login = montaLogin(() => carrega());
desenha(); carrega();
setInterval(() => { if (!document.hidden && !enviando && !arrastando) carrega(); }, 25000);
