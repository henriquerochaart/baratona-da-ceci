const $ = (id) => document.getElementById(id);

let meusVotos = {}, pontos = {}, votantes = 0, sugestoes = [], ocultos = new Set(), souAdmin = false;
let ordem = "votos", busca = "", ocupado = false, carregou = false;
let prazo = Date.parse("2026-11-18T23:59:59-03:00"), votacaoAberta = Date.now() <= prazo;

/* ---------- dados ---------- */
async function carrega() {
  try {
    const j = await api("/api/estado?token=" + encodeURIComponent(Sessao.token));
    pontos = j.pontos || {}; votantes = j.votantes || 0;
    sugestoes = (j.sugestoes || []).map((s) => ({ ...s, sug: true }));
    if (!ocupado) ocultos = new Set(j.ocultos || []);
    souAdmin = !!(j.meu && j.meu.admin);
    if (j.prazo) prazo = Date.parse(j.prazo);
    votacaoAberta = !!j.votacaoAberta;
    if (j.meu && !ocupado) {
      meusVotos = j.meu.v || {};
      if (j.meu.nome && j.meu.nome !== Sessao.nome) { Sessao.nomeAtual(j.meu.nome); login && login.desenha(); }
    } else if (!j.meu) { meusVotos = {}; }
    carregou = true; aviso("");
    tudo();
  } catch (e) {
    if (!carregou) $("status").innerHTML = "<span>não deu para carregar os votos agora.</span>";
  }
}

/* ---------- lista ---------- */
// base(): todos os bares, inclusive os apagados pelos admins; todos(): só os que aparecem.
function base() {
  const vistos = new Set(BARES.map((b) => norm(b.nome)));
  const extra = [];
  sugestoes.forEach((s) => { const k = norm(s.nome); if (!k || vistos.has(k)) return; vistos.add(k); extra.push(s); });
  return [...BARES, ...extra];
}
const todos = () => base().filter((b) => !ocultos.has(b.id));
const foiApagado = (k) => base().some((b) => ocultos.has(b.id) && norm(b.nome) === k);
const ranking = () => todos().sort((a, b) => (pontos[b.id] || 0) - (pontos[a.id] || 0) || a.nome.localeCompare(b.nome, "pt"));
const SETA = (up) => `<svg viewBox="0 0 22 18" aria-hidden="true"><path d="${up ? "M11 2L20 15H2Z" : "M11 16L20 3H2Z"}" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

function desenhaLista() {
  const ul = $("lista"); ul.textContent = "";
  const rank = ranking(), pos = {}; rank.forEach((b, i) => (pos[b.id] = i + 1));
  let itens = ordem === "az" ? [...rank].sort((a, b) => a.nome.localeCompare(b.nome, "pt")) : rank;
  const q = norm(busca);
  if (q) itens = itens.filter((b) => norm(b.nome + " " + (b.end || "")).includes(q));
  if (!itens.length) { const li = document.createElement("li"); li.className = "vazio"; li.textContent = "Nenhum bar com esse nome na lista."; ul.append(li); return; }
  itens.forEach((b) => {
    const li = document.createElement("li"); li.className = "bar" + (b.sug ? " sug" : ""); li.id = "bar-" + b.id;
    const fita = document.createElement("span"); fita.className = "fita"; fita.setAttribute("aria-hidden", "true");
    const th = document.createElement("button"); th.type = "button"; th.className = "thumb"; th.title = "Ver no mapa";
    th.setAttribute("aria-label", "Ver " + b.nome + " no mapa");
    if (b.foto) th.style.backgroundImage = `url("${b.foto}")`; else th.textContent = inicial(b.nome);
    th.onclick = () => voaPara(b, true);
    const p = document.createElement("span"); p.className = "pos"; p.textContent = pos[b.id]; th.append(p);
    const h = document.createElement("h3"); h.textContent = b.nome;
    const meta = document.createElement("p"); meta.className = "meta";
    if (b.end) meta.append(b.end + " · ");
    const a = document.createElement("a"); a.className = "maps"; a.href = mapsUrl(b); a.target = "_blank"; a.rel = "noopener"; a.textContent = "Google Maps"; meta.append(a);
    if (b.sug) { const s = document.createElement("span"); s.className = "por"; s.textContent = " · sugerido" + (b.por ? " por " + b.por : ""); meta.append(s); }
    if (souAdmin) {
      const ap = document.createElement("button"); ap.type = "button"; ap.id = "ap-" + b.id;
      ap.setAttribute("aria-label", "Apagar " + b.nome + " da lista"); ap.disabled = ocupado;
      pintaApagar(ap, estaArmado(b.id));
      ap.onclick = () => {
        if (!estaArmado(b.id)) {
          armado = { id: b.id, t: Date.now() }; pintaApagar(ap, true);
          setTimeout(() => { if (armado.id === b.id && !estaArmado(b.id)) { armado = { id: null, t: 0 }; const el = $("ap-" + b.id); if (el) pintaApagar(el, false); } }, ARMADO_MS + 50);
          return;
        }
        armado = { id: null, t: 0 }; administra("apagar", b);
      };
      meta.append(" · ", ap);
    }
    const v = document.createElement("div"); v.className = "voto";
    const meu = meusVotos[b.id] || 0, n = pontos[b.id] || 0;
    const up = document.createElement("button"); up.type = "button"; up.className = "up"; up.innerHTML = SETA(true);
    up.setAttribute("aria-pressed", String(meu === 1)); up.setAttribute("aria-label", "Votar a favor de " + b.nome);
    up.disabled = ocupado || !votacaoAberta; up.onclick = () => vota(b.id, 1);
    const pt = document.createElement("span"); pt.className = "pts" + (n > 0 ? " pos" : n < 0 ? " neg" : ""); pt.textContent = n; pt.setAttribute("aria-label", n + " pontos");
    const dn = document.createElement("button"); dn.type = "button"; dn.className = "down"; dn.innerHTML = SETA(false);
    dn.setAttribute("aria-pressed", String(meu === -1)); dn.setAttribute("aria-label", "Votar contra " + b.nome);
    dn.disabled = ocupado || !votacaoAberta; dn.onclick = () => vota(b.id, -1);
    v.append(up, pt, dn);
    li.append(fita, th, h, v, meta); ul.append(li);
  });
}
function atualizaStatus() {
  $("status").innerHTML = `<span><b>${votantes}</b> ${votantes === 1 ? "pessoa votou" : "pessoas votaram"}</span><span><b>${todos().length}</b> bares na lista</span>`;
}
function aviso(t) { const a = $("aviso"); a.textContent = t || ""; a.hidden = !t; }

/* ---------- contagem regressiva ---------- */
function relogio() {
  const falta = prazo - Date.now();
  if (falta <= 0) {
    $("cont-rot").textContent = "votação encerrada";
    $("relogio").hidden = true;
    $("cont-quando").textContent = "Obrigada por votar! O roteiro sai em breve.";
    if (votacaoAberta) { votacaoAberta = false; desenhaLista(); atualizaBusca(); }
    return;
  }
  const s = Math.floor(falta / 1000), pad = (n) => String(n).padStart(2, "0");
  $("c-d").textContent = Math.floor(s / 86400); $("c-h").textContent = pad(Math.floor(s / 3600) % 24);
  $("c-m").textContent = pad(Math.floor(s / 60) % 60); $("c-s").textContent = pad(s % 60);
}

/* ---------- mapa (MapLibre + OpenFreeMap) ---------- */
let mapa = null, marcadores = new Map(), popup = null;
const mapaWrap = $("mapa-wrap");
function iniciaMapa() {
  if (!window.maplibregl) { $("mapa").innerHTML = '<p class="vazio" style="padding:24px">O mapa não carregou. A lista abaixo funciona normalmente.</p>'; return; }
  mapa = new maplibregl.Map({
    container: "mapa", style: "https://tiles.openfreemap.org/styles/liberty",
    center: [-46.6905, -23.5605], zoom: 14.6, attributionControl: { compact: true }, cooperativeGestures: false,
  });
  mapa.addControl(new maplibregl.NavigationControl({ showZoom: false, visualizePitch: true }), "top-right");
  mapa.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "bottom-right");
  mapa.on("load", () => {
    const b = new maplibregl.LngLatBounds();
    BARES.forEach((x) => b.extend([x.lon, x.lat])); b.extend([ENCONTRO.lon, ENCONTRO.lat]);
    mapa.fitBounds(b, { padding: 40, duration: 0 });
  });
  const el = document.createElement("div"); el.className = "pino-enc";
  el.innerHTML = '<img src="/arte/estrela-laranja.webp" alt=""><span>Encontro · 14h</span>';
  new maplibregl.Marker({ element: el, anchor: "left", offset: [-20, 0] }).setLngLat([ENCONTRO.lon, ENCONTRO.lat])
    .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML("<b>Ponto de encontro · 14h</b>Rua dos Pinheiros, 1057")).addTo(mapa);
}
function desenhaMapa() {
  if (!mapa) return;
  const vistos = new Set();
  todos().forEach((b) => {
    if (typeof b.lat !== "number" || typeof b.lon !== "number") return;
    vistos.add(b.id);
    const meu = meusVotos[b.id] || 0, n = pontos[b.id] || 0;
    let m = marcadores.get(b.id);
    if (!m) {
      const el = document.createElement("button"); el.type = "button"; el.className = "pino";
      el.innerHTML = `<span class="foto-pino"${b.foto ? ` style="background-image:url('${b.foto}')"` : ""}>${b.foto ? "" : esc(inicial(b.nome))}</span><span class="nome-pino"><b>${esc(b.nome)}</b><i></i></span>`;
      el.addEventListener("click", (e) => { e.stopPropagation(); abrePopup(b); });
      m = new maplibregl.Marker({ element: el, anchor: "left", offset: [-22, 0] }).setLngLat([b.lon, b.lat]).addTo(mapa);
      marcadores.set(b.id, m);
    }
    const el = m.getElement();
    el.classList.toggle("up", meu === 1); el.classList.toggle("down", meu === -1); el.classList.toggle("sug", !!b.sug);
    el.querySelector("i").textContent = (n > 0 ? "▲ " : n < 0 ? "▼ " : "") + n + (Math.abs(n) === 1 ? " ponto" : " pontos");
    el.setAttribute("aria-label", `${b.nome}, ${n} pontos`);
  });
  for (const [id, m] of marcadores) if (!vistos.has(id)) { m.remove(); marcadores.delete(id); }
}
function abrePopup(b) {
  if (!mapa) return;
  if (popup) popup.remove();
  const n = pontos[b.id] || 0, meu = meusVotos[b.id] || 0;
  const div = document.createElement("div"); div.className = "pop";
  div.innerHTML = (b.foto ? `<span class="pop-foto" style="background-image:url('${b.foto}')"></span>` : "") +
    `<b>${esc(b.nome)}</b><span>${esc(b.end || "")}</span>`;
  const linha = document.createElement("div"); linha.className = "pop-votos";
  const up = document.createElement("button"); up.type = "button"; up.className = "up"; up.innerHTML = SETA(true); up.setAttribute("aria-pressed", String(meu === 1)); up.setAttribute("aria-label", "Votar a favor");
  const pt = document.createElement("strong"); pt.textContent = n;
  const dn = document.createElement("button"); dn.type = "button"; dn.className = "down"; dn.innerHTML = SETA(false); dn.setAttribute("aria-pressed", String(meu === -1)); dn.setAttribute("aria-label", "Votar contra");
  up.disabled = dn.disabled = !votacaoAberta;
  up.onclick = async () => { await vota(b.id, 1); abrePopup(b); };
  dn.onclick = async () => { await vota(b.id, -1); abrePopup(b); };
  const gm = document.createElement("a"); gm.href = mapsUrl(b); gm.target = "_blank"; gm.rel = "noopener"; gm.textContent = "Abrir no Google Maps";
  linha.append(up, pt, dn); div.append(linha, gm);
  popup = new maplibregl.Popup({ offset: 26, maxWidth: "240px" }).setLngLat([b.lon, b.lat]).setDOMContent(div).addTo(mapa);
}
function voaPara(b, rolar) {
  if (!mapa || typeof b.lat !== "number") { focaBar(b.id); return; }
  if (rolar && !mapaWrap.classList.contains("cheia")) mapaWrap.scrollIntoView({ behavior: "smooth", block: "center" });
  mapa.flyTo({ center: [b.lon, b.lat], zoom: 17, speed: 1.4 });
  abrePopup(b);
}
function focaBar(id) {
  if (mapaWrap.classList.contains("cheia")) telaCheia(false);
  if (busca) { busca = ""; $("q").value = ""; desenhaLista(); atualizaBusca(); }
  const li = $("bar-" + id); if (!li) return;
  document.querySelectorAll(".bar.ativo").forEach((x) => x.classList.remove("ativo"));
  li.classList.add("ativo");
  li.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
}

/* tela cheia: a busca vai para dentro do mapa; um único botão embaixo fecha */
const formBusca = $("busca"), lugarBusca = $("lugar-busca");
function telaCheia(on) {
  mapaWrap.classList.toggle("cheia", on);
  document.documentElement.classList.toggle("sem-rolagem", on);
  $("bt-ampliar").hidden = on; $("bt-fechar").hidden = !on;
  if (on) $("mapa-busca").append(formBusca); else lugarBusca.after(formBusca);
  setTimeout(() => mapa && mapa.resize(), 60);
}
$("bt-ampliar").onclick = () => telaCheia(true);
$("bt-fechar").onclick = () => telaCheia(false);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && mapaWrap.classList.contains("cheia")) telaCheia(false); });

/* ---------- busca e sugestão ---------- */
const q = $("q"), rua = $("rua"), add = $("add"), linhaEnd = $("linha-end"), dica = $("dica"), res = $("resultados");
let buscaTimer = null, buscaSeq = 0;
function atualizaBusca() {
  const k = norm(busca);
  if (!votacaoAberta) { linhaEnd.hidden = true; dica.textContent = "A votação fechou. Dá pra buscar na lista, mas não sugerir."; return; }
  if (!k) { linhaEnd.hidden = true; res.textContent = ""; dica.textContent = "Digite o nome do bar. Se ele não estiver na lista, dá pra adicionar."; return; }
  const lista = todos(), achou = lista.filter((b) => norm(b.nome + " " + (b.end || "")).includes(k)), exato = lista.some((b) => norm(b.nome) === k);
  const tirado = !exato && foiApagado(k);
  linhaEnd.hidden = exato || tirado || k.length < 3;
  add.disabled = ocupado;
  dica.textContent = exato ? "Esse bar já está na lista." : tirado ? "Esse bar foi tirado da lista." : k.length < 3 ? "Continue digitando." :
    achou.length ? `${achou.length} ${achou.length === 1 ? "bar parecido" : "bares parecidos"} na lista.` : "";
  const unico = achou.length === 1 ? achou[0] : lista.find((b) => norm(b.nome) === k);
  if (unico && mapaWrap.classList.contains("cheia")) voaPara(unico, false);
}
function buscaLugares(texto) {
  clearTimeout(buscaTimer);
  if (!votacaoAberta || norm(texto).length < 3) { res.textContent = ""; return; }
  buscaTimer = setTimeout(async () => {
    const seq = ++buscaSeq;
    try {
      const url = "https://photon.komoot.io/api/?" + new URLSearchParams({ q: texto + " São Paulo", lat: "-23.5605", lon: "-46.6905", limit: "10", bbox: "-46.715,-23.580,-46.670,-23.545" });
      const j = await (await fetch(url)).json();
      if (seq !== buscaSeq) return;
      const nomesLista = new Set(base().map((b) => norm(b.nome))), vistos = new Set();
      const achados = (j.features || []).map((f) => {
        const p = f.properties || {}, c = f.geometry && f.geometry.coordinates;
        const end = [p.street, p.housenumber].filter(Boolean).join(", ") + (p.district || p.locality ? " · " + (p.district || p.locality) : "");
        return { nome: p.name, end, lat: c && c[1], lon: c && c[0] };
      }).filter((x) => x.nome && typeof x.lat === "number" && !nomesLista.has(norm(x.nome)) && !vistos.has(norm(x.nome)) && vistos.add(norm(x.nome))).slice(0, 5);
      res.textContent = "";
      achados.forEach((x) => {
        const li = document.createElement("li");
        const info = document.createElement("button"); info.type = "button"; info.className = "info";
        const b = document.createElement("b"); b.textContent = x.nome; const s = document.createElement("span"); s.textContent = x.end || "Pinheiros / Vila Madalena";
        info.append(b, s); info.onclick = () => { if (mapa) { if (!mapaWrap.classList.contains("cheia")) mapaWrap.scrollIntoView({ behavior: "smooth", block: "center" }); mapa.flyTo({ center: [x.lon, x.lat], zoom: 17 }); } };
        const bt = document.createElement("button"); bt.type = "button"; bt.className = "add-res"; bt.textContent = "Adicionar"; bt.disabled = ocupado;
        bt.onclick = () => sugere({ nome: x.nome, end: x.end, lat: x.lat, lon: x.lon });
        li.append(info, bt); res.append(li);
      });
    } catch { if (seq === buscaSeq) res.textContent = ""; }
  }, 350);
}
q.addEventListener("input", () => { busca = q.value; desenhaLista(); atualizaBusca(); buscaLugares(busca.trim()); });
formBusca.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = busca.trim().replace(/\s+/g, " ");
  if (norm(nome).length < 3 || base().some((b) => norm(b.nome) === norm(nome))) return;
  sugere({ nome, end: rua.value.trim() });
});
async function sugere(item) {
  if (ocupado || !precisaLogin("sugerir um bar")) { if (mapaWrap.classList.contains("cheia")) telaCheia(false); return; }
  ocupado = true; add.disabled = true; res.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    const j = await api("/api/sugestao", { item });
    const novo = { ...j.item, por: Sessao.nome, sug: true };
    sugestoes.push(novo);
    q.value = ""; rua.value = ""; busca = ""; res.textContent = "";
    meusVotos[novo.id] = 1; pontos[novo.id] = (pontos[novo.id] || 0) + 1;
    api("/api/voto", { v: meusVotos }).catch(() => {});
    aviso(""); tudo();
    dica.textContent = `“${item.nome}” entrou na lista com o seu voto.`;
    voaPara(novo, false);
  } catch (e) { aviso(e.message); }
  ocupado = false; add.disabled = false; desenhaLista();
}

/* ---------- votos ---------- */
async function vota(id, dir) {
  if (ocupado || !votacaoAberta) return;
  if (!precisaLogin("votar")) { if (mapaWrap.classList.contains("cheia")) telaCheia(false); return; }
  const antes = { ...meusVotos }, prox = { ...meusVotos };
  if (prox[id] === dir) delete prox[id]; else prox[id] = dir;
  pontos[id] = (pontos[id] || 0) - (antes[id] || 0) + (prox[id] || 0);
  if (!Object.keys(antes).length && Object.keys(prox).length) votantes++;
  meusVotos = prox; ocupado = true; tudo();
  try { await api("/api/voto", { v: prox }); aviso(""); }
  catch (e) { pontos[id] = (pontos[id] || 0) - (prox[id] || 0) + (antes[id] || 0); meusVotos = antes; aviso(e.message); }
  ocupado = false; tudo();
}

/* ---------- admin (Ceci e Henrique): apagar e restaurar bares ---------- */
// "apagar" pede um segundo toque em até 4 s; o estado fica aqui fora para sobreviver ao redesenho da lista.
const ARMADO_MS = 4000;
let armado = { id: null, t: 0 };
const estaArmado = (id) => armado.id === id && Date.now() - armado.t < ARMADO_MS;
function pintaApagar(el, ligado) {
  el.className = "apagar" + (ligado ? " armado" : "");
  el.textContent = ligado ? "toque de novo pra apagar" : "apagar";
}
async function administra(acao, b) {
  if (ocupado) return;
  ocupado = true; tudo();
  try {
    const j = await api("/api/admin", { acao, id: b.id });
    ocultos = new Set(j.ocultos || []);
    if (popup) popup.remove();
    aviso(acao === "apagar" ? `${b.nome} saiu da lista. Dá pra restaurar no painel de admin.` : `${b.nome} voltou pra lista.`);
  } catch (e) { aviso(e.message); }
  ocupado = false; tudo();
}
function desenhaAdmin() {
  const box = $("admin");
  box.hidden = !souAdmin;
  if (!souAdmin) return;
  const ul = $("apagados"); ul.textContent = "";
  const lista = base().filter((b) => ocultos.has(b.id)).sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  $("admin-resumo").textContent = lista.length
    ? `${lista.length} ${lista.length === 1 ? "bar apagado" : "bares apagados"}. Os votos ficam guardados e voltam se você restaurar.`
    : "Nenhum bar apagado. Pra apagar, use o “apagar” ao lado do bar na lista.";
  lista.forEach((b) => {
    const li = document.createElement("li");
    const n = document.createElement("span"); n.textContent = b.nome + (b.sug ? " (sugestão)" : "");
    const r = document.createElement("button"); r.type = "button"; r.textContent = "restaurar"; r.disabled = ocupado;
    r.setAttribute("aria-label", "Restaurar " + b.nome); r.onclick = () => administra("restaurar", b);
    li.append(n, r); ul.append(li);
  });
}

/* ---------- geral ---------- */
function tudo() { atualizaStatus(); desenhaLista(); desenhaMapa(); atualizaBusca(); desenhaAdmin(); }
const fv = $("f-votos"), fa = $("f-az");
fv.onclick = () => { ordem = "votos"; fv.setAttribute("aria-pressed", "true"); fa.setAttribute("aria-pressed", "false"); desenhaLista(); };
fa.onclick = () => { ordem = "az"; fa.setAttribute("aria-pressed", "true"); fv.setAttribute("aria-pressed", "false"); desenhaLista(); };

const login = montaLogin(() => carrega());
iniciaMapa(); tudo(); carrega(); relogio();
setInterval(relogio, 1000);
setInterval(() => { if (!document.hidden && !ocupado) carrega(); }, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) carrega(); });
