const G = "https://lh3.googleusercontent.com/grass-cs/";
const F = (k, s = "=s4800-w800-h600") => G + k + s;
const ENCONTRO = { lat: -23.5681543, lon: -46.6877116 };
const BARES = [
  ["tantin", "Tantin", "R. dos Pinheiros, 987", -23.5675688, -46.6871967, F("AABkmLeV-CBGoETeSTQKgJDrL3SwoCWY0FUzpOhpwOuxtSK8Hr7NhwDbV84-Sgd9Xfu62pEqdRlpFxT-YtUggAT8RcNU2VlNGBRPxLMO1JH-i_2EMah_2JwQN65heg051OIwRJ7Uth108XlloNM")],
  ["colchetes", "Colchetes", "R. Mateus Grou, 162", -23.5645205, -46.6840381, F("AABkmLcuuN1fKkUrWzY2blw5rwiaEA1__8I5uVS6Ns3ONkq7j89yXAPTjN7rf4FCWwxGmq-mGd1jTS5iDruYK0IJ7vXNBkqnFOgoeoYP8rRStywpgXhVwa3E2oPnKxZRLkVJz2dAmxmkOg")],
  ["ohmadalena", "Oh! Madalena", "R. Horácio Lane, 207", -23.558783, -46.6872521, F("AABkmLfZ_ENffC4gwqJ4j3QNvMXB50Jx3jLXeb9SncrGE4W5EwBx_DkJJO3Eu2AYBUaiDkeZ3NFC1iEt_5M_n7sctlZym4-ku8iial1IpJkB5cw9vOS5UF6o-yspx0JM7UrTgX1AYew")],
  ["rainha", "Rainha da Vila Madalena", "R. Fradique Coutinho, 1070", -23.557987, -46.6899104, F("AABkmLfV8Y_Vb1WTlXdX2hZbmrb0MC3P1mT_5VnM-9nbSKtxXaVgRXeR55Cdor_D9d-C5pquTS1X0m1KLcD_qxPt5GM1lNfU03fXiEsCUaTdSmSigZojC_VoRg8P5aoCod5Qfgw2ZpJU")],
  ["butiquim", "Butiquim da Cidade", "R. Fradique Coutinho, 1127", -23.5577306, -46.6904879, F("AABkmLecdEoOFaiAw339rYn_EX5yE-DPjYmt6wMFTgdeba_tXn61QKYIavixD3NkUxDE6gHsksXT36TeiaEkPWx4krW5ob6XSxcp5lyj7RJ8LK0YUJ8Nb86PAdeg2fwpOK9bL-ReQUk")],
  ["pasquim", "O Pasquim", "R. Aspicuelta, 524", -23.5579319, -46.6903496, F("AABkmLfaV7ZwwVBCGZJdJ-GVyzRHdpzuCtPvIZUFJKQkOrjQ4zz7mqU-I3wszOU2GbL6QskAsBvQfGI2X7nWWmtYqXi7R5VWY6nmvTawLgTcLo1vz_zlw-z_60j9CtTNILMuVPytA6zH")],
  ["piola", "Armazém Piola", "R. Aspicuelta, 547", -23.5583151, -46.6903171, F("AABkmLd59l1LPYWo-GDkmzXrRo4-9oF7aQ5plwg_X0F-GV7Uv9GNjfFsHi-ep_d_pmsaWMmyXjP-6735QVHF9vaXR1AmowQI-ODC1wpRUA5L8996SXUxoCxTV6DOvgYlZcaumpyDFh11etwoxK6L")],
  ["todosossantos", "Boteco Todos os Santos", "R. Aspicuelta, 585", -23.5585312, -46.6906309, F("AABkmLe1AP3kmu0tr4YjiRG-eQKUPsh6ZP0hCjy8vZW7bIe3bSVsUMZNc_qxijxiaz9XH1TmfmUiHXpywzmJy4tOaj7Kmxv1HoRM0S-hDgLF7BB5-7SGGXcJxq1sLtumAHNfmRiN-lsu")],
  ["quintal", "Quintal do Espeto", "R. Mourato Coelho, 1022", -23.5588569, -46.6906294, F("AABkmLclG5k2a-VqXfYxok0BN1P-iY7HiEzn0qJQy9eu5DOxuQWUDXQt9aGyZrSeFHvrheuTRhZna6B4arDbpYIUhP88MwZn0IYiUMWDrbfGR9ucUuwNwNa3gRAxAVpXvisi8S5qbefp")],
  ["saobento", "Boteco São Bento", "R. Mourato Coelho, 1060", -23.558607, -46.690845, F("AABkmLdRBmCX5zAsCNU_DToeePWWr1dakuOne6Q3iIhpRL-hnwx3qc8v4nU_sVadysFi6CDGHamoPIehmhprCae7s_PBiNYu9dmWqAZyksmwAjKg4g7llD9L_CV5e-v4VCYN6stkx4AMQceNRkU")],
  ["patriarca", "Patriarca", "R. Mourato Coelho, 1059", -23.5587469, -46.691148, F("AABkmLcjIjst8EmMxqhRdB8ovoNmtiXEerkjo0jTrvREjZNBFEjB_YFvmqucg1cNMDdMwpm7R3rIuchLTDNgOEWp73Bd4nuCmfnrip1QD4df67Pq5J_IatN2Y07rKOeXJx5_ZZjh66Bh-yxyp9hR")],
  ["disse", "Disse Que Me Disse", "R. Fidalga, 408", -23.5559827, -46.6900519, F("AABkmLc9i1-H2AYsF2QCaGL7yc8_PQiHmEenk_zJ2Y5PLq7TaZQmO31UwPEGzx4ypR_y4uSRZdMRz6Kob2vEEFcaUp7BRc6tkk8p9nE0Ds7f6vXqbbPVZSLVD7OkuQVWGNKHXcCoYqtl4z7G2YZw")],
  ["goela", "Goela", "R. Fidalga, 396", -23.5560406, -46.6899729, F("AABkmLdhIsGZYIjjcvUuoXRKd_4FOLVjIT2ZF3JTpqZ3bhg7cdvEdyZ3mJK5g-eDbUSoJOQd_db4Fksa2dBx2DWwLommBHFRoDuNPI6p4yFrxQ6sQ21oajU3E613pFMk-x_XR6tqOWDu")],
  ["croma", "Croma Beer Co.", "R. Harmonia, 472", -23.5539546, -46.6885875, F("AABkmLdBEgY_umTKLGQ00ohAwfLGRvRDfx6qu7ZTQ7ARSyaBsnVTVgpwXkosNg26OPlewpTx88ghkPq1sGk5Kc1vyxu0QNU8kyUN1aq8pWk-qJkkSLVXRMliZBKj1rqpIbf9URDFDPZt")],
  ["backyard", "Backyard", "R. Harmonia, 255", -23.5558235, -46.6878459, F("AABkmLeK1jrey2A4dnlZOlV29CEDf2To4_IhMvMswkEUBVSZlzLLyyAywITJD74G4rtPcNs5KdJXCv71kVrehNKEbSUN7lCjw4v1RmzHPoNiUnszK2MW5b5A2Rv81KE9AJeYSsY9Iyl6")],
  ["pracinha", "Pracinha do Seu Justino", "R. Harmonia, 117", -23.556885, -46.687129, F("AABkmLcwCtDLispG5g6PwGHdfGC6F2TDKbcOM3cUBlK8Bae6hMTrozGTOTclZP_Fe08zFnG7NfW1BFuDNe-eZY-OBszW4knVnNtvt5msnHuJHkR5WLkneKAUM4QpFrmunxMf6Dcfhp7Bbw")],
  ["quitandinha", "Quitandinha", "R. Fidalga, 242", -23.5572453, -46.6891327, F("AABkmLcxy9ffhAA8XptpjIpVpp5aeehzb-GNe3iQ6F9-f3LUAeMkybVg0MempK873plDFLLbjJF-AySCE02gcXcsRMXf7N3rnTNISn7Vmujf5MsvE1nGW6wTopc7Ec2F4x62VWf9r0pH")],
  ["banqueta", "Banqueta", "R. Aspicuelta, 202", -23.5562513, -46.687795, F("AABkmLeiZ3VRnkBPI87FMFm5LrGLq7_4GZ_y-QZZy0_4TskKwnrfnvcDUVdD1xU10eediaTqaTbq5Xpbl0x0ls4PXoL5VrYE8x-fQIBJjv6Q2Ls8kvvwruynaPQaeI2AXmMYekUnYQ")],
  ["deprimeira", "De Primeira Botequim", "R. Aspicuelta, 271", -23.5568601, -46.6880805, F("AABkmLcf5CRRC-SCeTaaeJsNeu7SDPYgLNgzVxaI_q3grzJ0wzDPgDYd_udkPz5ECsc4tPAtbS4_-d-mccqJZpYMFVpB0xQ1ZrN0s4s6UBuvBEncLiz5Rjw7w0V3DxuodMP4FSJo77Gm4Q")],
  ["curtica", "Curtiça", "R. Inácio Pereira da Rocha, 87", -23.5590771, -46.6877763, F("AABkmLc5LV1ASKq67fDTh_kL6bDt5Xxk4FoauYDF8B-pwWwha193_Ff9TghRlZjFs0uY5CdA-EcmYe6yG1hYeGrd_H0lcybgbWzexxQOIRm7UoozHDAd2iVjl1UlGLsWIreOY9BWkuETKw1QEZgP")],
  ["torneira", "Torneira", "R. Inácio Pereira da Rocha, 121", -23.559373, -46.6880969, F("AABkmLdXrzQw6a3PtUTzWLNVDixKrjP389Y7Sh4tSDq2Vr8a2tbMTXEj9-WrPI9FqHcwPC2-BEM4kOaHemeGv7NdTYfykJM4J78_rbtWE2T1R8vZYR-Fa8ZV5iB5t5lFqdlOJUDpVs4j", "=s4800-w800-h576")],
  ["supra", "Supra Bar", "R. Mourato Coelho, 838", -23.5602844, -46.6897723, F("AABkmLcZn1O3k6VZazgUMrvyBvytJGcjX975xQDTJ_y-rJjiWpZU0eyOnYVYb1Fzft8BUkf2X1f7_frH0KlLLyYjpYcQB8u_0rwCQjX3VCY9pFdyQ6CNYIMcxn750X2gR6zsQB2CHmpI", "=s4800-w800-h539")],
  ["cardealpub", "Cardeal Pub", "R. Cardeal Arcoverde, 1899", -23.5623649, -46.6893834, F("AABkmLeOo6iEHWURiEiXcrqaXsD3bYyQlqjsAfcRHnIEtPc3FjhPH4-PBefML-4Lb7Fj-i4m5jCEDf9bq_JNeetuoAWyyPO9KLoIPlFyGKqPcat0B8U1S4hoJBr1aNP0INRHh9R5MEun7yZu99I")],
  ["moela", "Bar Moela", "R. Cardeal Arcoverde, 2320", -23.5645451, -46.692933, F("AABkmLdwk87_VfTbCAXxD5HggC_FASbUOGSdh7yPQ_GbxDFMYjJXa96HxNihukeDI7hD45MmT3o2djhLn5YpjxBQ5dWlphIESdkQHDRKmyEGooPnxtgBP_miuynew5snfMYnLpOsuVJ8")],
  ["pitico", "Pitico", "R. Guaicuí, 61", -23.5662379, -46.6960825, F("AABkmLdl2--fD8yO1v5AVOMFE4q84Y6MpeXVBd_r0mgh1GKdxXPFR-SQAwKynSos3OKhP4ZoHU6lnM-IdlvhUMvDGGwzUv1y60ACxOBNKnwnaVEIRPjwcnG5YDGJ4Ygf2Mvfj99Du2fuqh3mmGU")],
  ["arlete", "Arlete", "R. Vupabussu, 101", -23.5599636, -46.6974309, F("AABkmLfwvNACjJmdLQ8MjWsGyMHG-VhqoPxaRTABeyu3pZb27agz3Q5Oc6Y63r4qJ52iA57mXYCaf0q5N8Xu0aC0z6f1jWPzhxL5EzRkmzLOOUc6_x9fFpkdtj-HpjFUKlN1kX6b0tOj_w", "=s4800-w800-h595")],
  ["paramount", "Boteco Paramount", "R. dos Pinheiros, 1179", -23.5681896, -46.6890101, ""],
  ["seujustino", "Seu Justino", "R. Harmonia, 77", -23.5572069, -46.6870026, ""],
  ["gonzaga", "Bar do Gonzaga", "R. Cardeal Arcoverde, 2865", -23.5688889, -46.6949368, ""],
  ["caoveio", "Cão Véio", "R. Girassol, 396", -23.5552118, -46.6892262, ""],
  ["paroquia", "Bar Paróquia", "R. Wisard, 426", -23.5560145, -46.6910304, ""],
  ["bardobaixo", "Bar do Baixo", "R. Girassol", -23.557888, -46.687707, ""],
].map(([id, nome, end, lat, lon, foto]) => ({ id, nome, end, lat, lon, foto, sug: false }));

const $ = (id) => document.getElementById(id);
const norm = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const inicial = (n) => (norm(n)[0] || "?").toUpperCase();
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let voter = null;
try { voter = localStorage.getItem("baratona-voter"); } catch {}
if (!voter || !/^[a-z0-9-]{8,40}$/.test(voter)) {
  voter = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).toLowerCase();
  try { localStorage.setItem("baratona-voter", voter); } catch {}
}

let meusVotos = {}, pontos = {}, votantes = 0, sugestoes = [], confirmados = [], euVou = false, meuNome = "";
let ordem = "votos", busca = "", ocupado = false, carregou = false;
try { meuNome = localStorage.getItem("baratona-nome") || ""; } catch {}

/* ---------- API ---------- */
async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voter, ...body }) } : { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Algo deu errado.");
  return j;
}
async function carrega() {
  try {
    const j = await api("/api/estado?voter=" + encodeURIComponent(voter));
    pontos = j.pontos || {}; votantes = j.votantes || 0; sugestoes = (j.sugestoes || []).map((s) => ({ ...s, sug: true }));
    confirmados = j.confirmados || [];
    if (j.meu && !ocupado) {
      meusVotos = j.meu.v || {}; euVou = !!j.meu.vai;
      if (j.meu.nome && !meuNome) meuNome = j.meu.nome;
    }
    carregou = true; aviso("");
    tudo();
  } catch (e) {
    if (!carregou) { $("status").innerHTML = "<span>não deu para carregar os votos agora.</span>"; }
  }
}

/* ---------- lista ---------- */
function todos() {
  const vistos = new Set(BARES.map((b) => norm(b.nome)));
  const extra = [];
  sugestoes.forEach((s) => { const k = norm(s.nome); if (!k || vistos.has(k)) return; vistos.add(k); extra.push(s); });
  return [...BARES, ...extra];
}
const ranking = () => todos().sort((a, b) => (pontos[b.id] || 0) - (pontos[a.id] || 0) || a.nome.localeCompare(b.nome, "pt"));
const mapsUrl = (b) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(b.nome + (b.end ? ", " + b.end : "") + ", São Paulo");
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
    const th = document.createElement("span"); th.className = "thumb";
    if (b.foto) { th.style.backgroundImage = `url("${b.foto}")`; th.setAttribute("role", "img"); th.setAttribute("aria-label", "Foto do " + b.nome); }
    else th.textContent = inicial(b.nome);
    const p = document.createElement("span"); p.className = "pos"; p.textContent = pos[b.id]; p.title = "Posição no ranking"; th.append(p);
    const h = document.createElement("h3"); h.textContent = b.nome;
    const meta = document.createElement("p"); meta.className = "meta";
    if (b.end) meta.append(b.end + " · ");
    const a = document.createElement("a"); a.className = "maps"; a.href = mapsUrl(b); a.target = "_blank"; a.rel = "noopener"; a.textContent = "Maps"; meta.append(a);
    if (b.sug) { const s = document.createElement("span"); s.className = "por"; s.textContent = " · sugerido" + (b.por ? " por " + b.por : ""); meta.append(s); }
    const v = document.createElement("div"); v.className = "voto";
    const meu = meusVotos[b.id] || 0, n = pontos[b.id] || 0;
    const up = document.createElement("button"); up.type = "button"; up.className = "up"; up.innerHTML = SETA(true);
    up.setAttribute("aria-pressed", String(meu === 1)); up.setAttribute("aria-label", "Votar a favor de " + b.nome); up.disabled = ocupado; up.onclick = () => vota(b.id, 1);
    const pt = document.createElement("span"); pt.className = "pts" + (n > 0 ? " pos" : n < 0 ? " neg" : ""); pt.textContent = n; pt.setAttribute("aria-label", n + " pontos");
    const dn = document.createElement("button"); dn.type = "button"; dn.className = "down"; dn.innerHTML = SETA(false);
    dn.setAttribute("aria-pressed", String(meu === -1)); dn.setAttribute("aria-label", "Votar contra " + b.nome); dn.disabled = ocupado; dn.onclick = () => vota(b.id, -1);
    v.append(up, pt, dn);
    li.append(fita, th, h, v, meta); ul.append(li);
  });
}
function atualizaStatus() {
  $("status").innerHTML = `<span><b>${votantes}</b> ${votantes === 1 ? "pessoa votou" : "pessoas votaram"}</span><span><b>${todos().length}</b> bares na lista</span>`;
}
function aviso(t) { const a = $("aviso"); a.textContent = t || ""; a.hidden = !t; }

/* ---------- mapa ---------- */
let mapa = null, camada = null;
function iniciaMapa() {
  if (!window.L) { $("mapa").innerHTML = '<p class="vazio" style="padding:24px">O mapa não carregou. A lista abaixo funciona normalmente.</p>'; return; }
  mapa = L.map("mapa", { scrollWheelZoom: false, tap: true }).setView([ENCONTRO.lat, ENCONTRO.lon], 15);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 19, subdomains: "abcd",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(mapa);
  const estrela = '<svg viewBox="0 0 60 60" width="46" height="46"><path d="M30 4L36.5 22.5 56 23.5 40.5 35.5 46 54.5 30 43.5 14 54.5 19.5 35.5 4 23.5 23.5 22.5Z" fill="#F7C548" stroke="#2A1D22" stroke-width="3" stroke-linejoin="round"/></svg>';
  L.marker([ENCONTRO.lat, ENCONTRO.lon], { icon: L.divIcon({ className: "", html: `<div class="mk-enc">${estrela}</div>`, iconSize: [46, 46], iconAnchor: [23, 23] }), zIndexOffset: 1000, title: "Ponto de encontro" })
    .addTo(mapa).bindPopup("<b>Ponto de encontro · 14h</b>Rua dos Pinheiros, 1057");
  camada = L.layerGroup().addTo(mapa);
  const pts = BARES.map((b) => [b.lat, b.lon]).concat([[ENCONTRO.lat, ENCONTRO.lon]]);
  mapa.fitBounds(pts, { padding: [24, 24] });
}
function desenhaMapa() {
  if (!mapa) return;
  camada.clearLayers();
  todos().forEach((b) => {
    if (typeof b.lat !== "number" || typeof b.lon !== "number") return;
    const meu = meusVotos[b.id] || 0;
    const cls = "mk" + (meu === 1 ? " up" : meu === -1 ? " down" : "") + (b.sug ? " sug" : "");
    const estilo = b.foto ? ` style="background-image:url('${b.foto}')"` : "";
    const icon = L.divIcon({ className: "", html: `<div class="${cls}"${estilo}>${b.foto ? "" : esc(inicial(b.nome))}</div>`, iconSize: [44, 44], iconAnchor: [22, 22] });
    const m = L.marker([b.lat, b.lon], { icon, title: b.nome, riseOnHover: true }).addTo(camada);
    const n = pontos[b.id] || 0;
    const div = document.createElement("div");
    div.innerHTML = `<b>${esc(b.nome)}</b>${esc(b.end || "")}<br>${n} ${Math.abs(n) === 1 ? "ponto" : "pontos"}`;
    const bt = document.createElement("button"); bt.type = "button"; bt.textContent = "Ver na lista"; bt.onclick = () => { m.closePopup(); focaBar(b.id); };
    div.append(document.createElement("br"), bt);
    m.bindPopup(div);
  });
}
function focaBar(id) {
  if (busca) { busca = ""; $("q").value = ""; desenhaLista(); atualizaBusca(); }
  const li = $("bar-" + id); if (!li) return;
  document.querySelectorAll(".bar.ativo").forEach((x) => x.classList.remove("ativo"));
  li.classList.add("ativo");
  li.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
}

/* ---------- busca e sugestão ---------- */
const q = $("q"), rua = $("rua"), add = $("add"), linhaEnd = $("linha-end"), dica = $("dica"), res = $("resultados");
let buscaTimer = null, buscaSeq = 0;
function atualizaBusca() {
  const k = norm(busca);
  if (!k) { linhaEnd.hidden = true; res.textContent = ""; dica.textContent = "Digite o nome do bar. Se ele não estiver na lista, dá pra adicionar."; return; }
  const lista = todos(), achou = lista.filter((b) => norm(b.nome + " " + (b.end || "")).includes(k)), exato = lista.some((b) => norm(b.nome) === k);
  linhaEnd.hidden = exato || k.length < 3;
  add.disabled = ocupado;
  dica.textContent = exato ? "Esse bar já está na lista. Vote nele abaixo." :
    k.length < 3 ? "Continue digitando." :
    achou.length ? `${achou.length} ${achou.length === 1 ? "bar parecido" : "bares parecidos"} na lista abaixo.` : "";
}
function buscaNoMapa(texto) {
  clearTimeout(buscaTimer);
  const k = norm(texto);
  if (k.length < 3) { res.textContent = ""; return; }
  buscaTimer = setTimeout(async () => {
    const seq = ++buscaSeq;
    try {
      const url = "https://photon.komoot.io/api/?" + new URLSearchParams({ q: texto + " São Paulo", lat: "-23.5605", lon: "-46.6905", limit: "10", bbox: "-46.715,-23.580,-46.670,-23.545" });
      const r = await fetch(url); const j = await r.json();
      if (seq !== buscaSeq) return;
      const nomesLista = new Set(todos().map((b) => norm(b.nome)));
      const vistos = new Set();
      const achados = (j.features || []).map((f) => {
        const p = f.properties || {}, c = f.geometry && f.geometry.coordinates;
        const end = [p.street, p.housenumber].filter(Boolean).join(", ") + (p.district || p.locality ? " · " + (p.district || p.locality) : "");
        return { nome: p.name, end, lat: c && c[1], lon: c && c[0] };
      }).filter((x) => x.nome && typeof x.lat === "number" && !nomesLista.has(norm(x.nome)) && !vistos.has(norm(x.nome)) && vistos.add(norm(x.nome))).slice(0, 5);
      res.textContent = "";
      achados.forEach((x) => {
        const li = document.createElement("li");
        const info = document.createElement("div"); info.className = "info";
        const b = document.createElement("b"); b.textContent = x.nome; const s = document.createElement("span"); s.textContent = x.end || "Pinheiros / Vila Madalena";
        info.append(b, s);
        const bt = document.createElement("button"); bt.type = "button"; bt.textContent = "Adicionar"; bt.disabled = ocupado;
        bt.onclick = () => sugere({ nome: x.nome, end: x.end, lat: x.lat, lon: x.lon });
        li.append(info, bt); res.append(li);
      });
    } catch { if (seq === buscaSeq) res.textContent = ""; }
  }, 350);
}
q.addEventListener("input", () => { busca = q.value; desenhaLista(); atualizaBusca(); buscaNoMapa(busca.trim()); });
$("busca").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = busca.trim().replace(/\s+/g, " ");
  if (norm(nome).length < 3 || todos().some((b) => norm(b.nome) === norm(nome))) return;
  sugere({ nome, end: rua.value.trim() });
});
async function sugere(item) {
  if (ocupado) return;
  ocupado = true; add.disabled = true; res.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    const j = await api("/api/sugestao", { item, nome: meuNome });
    sugestoes.push({ ...j.item, por: meuNome, sug: true });
    q.value = ""; rua.value = ""; busca = ""; res.textContent = "";
    aviso(""); tudo();
    dica.textContent = `“${item.nome}” entrou na lista. Já pode votar nele.`;
    meusVotos[j.item.id] = 1; pontos[j.item.id] = (pontos[j.item.id] || 0) + 1;
    api("/api/voto", { v: meusVotos }).catch(() => {});
    tudo(); focaBar(j.item.id);
  } catch (e) { aviso(e.message || "A sugestão não foi salva. Tente de novo."); }
  ocupado = false; add.disabled = false; desenhaLista();
}

/* ---------- votos ---------- */
async function vota(id, dir) {
  if (ocupado) return;
  const antes = { ...meusVotos }, prox = { ...meusVotos };
  if (prox[id] === dir) delete prox[id]; else prox[id] = dir;
  pontos[id] = (pontos[id] || 0) - (antes[id] || 0) + (prox[id] || 0);
  if (!Object.keys(antes).length && Object.keys(prox).length) votantes++;
  meusVotos = prox; ocupado = true; tudo();
  try { await api("/api/voto", { v: prox }); aviso(""); }
  catch (e) { pontos[id] = (pontos[id] || 0) - (prox[id] || 0) + (antes[id] || 0); meusVotos = antes; aviso("Seu voto não foi salvo. Tente de novo."); }
  ocupado = false; tudo();
}

/* ---------- presença ---------- */
const btn = $("rsvp"), quem = $("quem-vai"), nomeInput = $("nome");
nomeInput.value = meuNome;
function desenhaPresenca() {
  btn.disabled = ocupado;
  btn.setAttribute("aria-pressed", String(euVou));
  btn.textContent = euVou ? "✓ Presença confirmada · desfazer" : "Confirmar presença";
  $("nome-campo").hidden = euVou;
  const n = confirmados.length;
  if (!carregou) return;
  if (!n) { quem.textContent = "Ninguém confirmou ainda."; return; }
  quem.textContent = "";
  const b = document.createElement("b"); b.textContent = n + (n === 1 ? " confirmado" : " confirmados");
  quem.append(b, ": " + confirmados.map((c) => (c.eu ? c.nome + " (você)" : c.nome)).join(", "));
}
btn.addEventListener("click", async () => {
  if (ocupado) return;
  const nome = nomeInput.value.replace(/\s+/g, " ").trim();
  if (!euVou && nome.length < 2) { aviso("Escreva seu nome para confirmar presença."); nomeInput.focus(); return; }
  ocupado = true; desenhaPresenca();
  try {
    const vai = !euVou;
    await api("/api/presenca", { nome: vai ? nome : meuNome, vai });
    if (vai) { meuNome = nome; try { localStorage.setItem("baratona-nome", nome); } catch {} }
    euVou = vai;
    confirmados = confirmados.filter((c) => !c.eu);
    if (vai) confirmados.push({ nome, eu: true });
    aviso("");
  } catch (e) { aviso(e.message || "Não deu para salvar sua presença."); }
  ocupado = false; desenhaPresenca();
});

/* ---------- geral ---------- */
function tudo() { atualizaStatus(); desenhaLista(); desenhaMapa(); desenhaPresenca(); atualizaBusca(); }
const fv = $("f-votos"), fa = $("f-az");
fv.onclick = () => { ordem = "votos"; fv.setAttribute("aria-pressed", "true"); fa.setAttribute("aria-pressed", "false"); desenhaLista(); };
fa.onclick = () => { ordem = "az"; fa.setAttribute("aria-pressed", "true"); fv.setAttribute("aria-pressed", "false"); desenhaLista(); };

iniciaMapa(); tudo(); carrega();
setInterval(() => { if (!document.hidden && !ocupado) carrega(); }, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) carrega(); });
