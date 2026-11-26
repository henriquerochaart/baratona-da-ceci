/* Straga: cronômetro + GPS + checkpoint com selfie, tudo no celular (localStorage).
   Visual de Strava: satélite inclinado, câmera seguindo o trajeto, números em branco por cima do mapa.
   Modo demonstração: percorre o PERCURSO.linha acelerado, com selfies de exemplo. */
(function () {
  const $ = (id) => document.getElementById(id);
  const CHAVE = "straga-atividade";
  const RAIO = 80; // metros para sugerir um bar como "aqui"
  const PERTO = 400;
  const LARANJA = "#FC4C02";
  const AVISO_INICIO = () => "Aperte Iniciar onde você estiver.";
  const SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const CREDITO = "Imagens © Esri, Maxar, Earthstar Geographics";
  const ESTILO = {
    version: 8,
    sources: { sat: { type: "raster", tiles: [SAT], tileSize: 256, maxzoom: 19, attribution: CREDITO } },
    layers: [
      { id: "fundo", type: "background", paint: { "background-color": "#1E2A22" } },
      { id: "sat", type: "raster", source: "sat", paint: { "raster-fade-duration": 0 } },
    ],
  };

  /* ---------- paradas do percurso ---------- */
  const idx = new Map(BARES.map((b) => [b.id, b]));
  const BARS = PERCURSO.paradas.map((p, i) => {
    const b = idx.get(p.id) || {};
    return { id: p.id, n: i + 1, hora: p.hora, nome: p.nome || b.nome, end: p.end || b.end, lat: p.lat ?? b.lat, lon: p.lon ?? b.lon };
  }).filter((b) => b.nome && typeof b.lat === "number");
  const TOTAL = BARS.length;
  const PLANO = PERCURSO.linha && PERCURSO.linha.length ? PERCURSO.linha : BARS.map((b) => [b.lon, b.lat]);
  
  /* ---------- utilitários ---------- */
  const R = 6371000, rad = (g) => (g * Math.PI) / 180;
  const dist = ([lo1, la1], [lo2, la2]) => {
    const a = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  const rumo = ([lo1, la1], [lo2, la2]) => {
    const y = Math.sin(rad(lo2 - lo1)) * Math.cos(rad(la2));
    const x = Math.cos(rad(la1)) * Math.sin(rad(la2)) - Math.sin(rad(la1)) * Math.cos(rad(la2)) * Math.cos(rad(lo2 - lo1));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };
  const relogio = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  // no HUD: mm:ss na primeira hora, depois h:mm
  const tempoCurto = (ms) => {
    const s = Math.floor(ms / 1000);
    return s < 3600 ? [`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, "min"] : [`${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}`, "h"];
  };
  const kmN = (m) => (m / 1000).toFixed(2).replace(".", ",");
  const km = (m) => kmN(m) + " km";
  const hhmm = (ms) => { const m = Math.floor(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} min`; };

  /* ---------- estado ---------- */
  const novo = () => ({ status: "parado", acum: 0, desde: 0, inicioEm: 0, trilha: [], metros: 0, checks: [], kudos: 0, drinks: [], menos: 0, conq: {} });
  let S = novo(), demo = null;
  try { const s = JSON.parse(localStorage.getItem(CHAVE) || "null"); if (s && s.status) S = { ...novo(), ...s }; } catch {}
  const salva = () => { if (demo) return; try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch { aviso("O celular não deixou salvar. Se fechar a página, a atividade se perde.", true); } };
  const tempo = () => (demo ? demo.relogio : S.acum + (S.status === "rodando" ? Date.now() - S.desde : 0));

  function aviso(t, erro) { const a = $("aviso"); a.textContent = t; a.classList.toggle("erro", !!erro); }

  /* ---------- conquistas ---------- */
  const CONQ = [
    { id: "gole", nome: "Primeiro gole", desc: "Registrou o primeiro drink.", ok: (a) => a.drinks.length >= 1 },
    { id: "esquenta", nome: "Esquenta", desc: "3 drinks na conta.", ok: (a) => a.drinks.length >= 3 },
    { id: "doidera", nome: "Doidera", desc: "5 drinks em menos de 1 hora.", ok: (a) => a.drinks.some((t, i) => i >= 4 && t - a.drinks[i - 4] <= 3600000) },
    { id: "pinguco", nome: "Pinguço", desc: "10 drinks na conta.", ok: (a) => a.drinks.length >= 10 },
    { id: "bebum", nome: "Bebum oficial", desc: "15 drinks na conta.", ok: (a) => a.drinks.length >= 15 },
    { id: "perdeu", nome: "Perdeu a conta", desc: "20 drinks. Ou mais, sei lá.", ok: (a) => a.drinks.length >= 20 },
    { id: "quemeu", nome: "Quem? Eu?", desc: "Tirou um drink da conta.", ok: (a) => (a.menos || 0) > 0 },
    { id: "primeirobar", nome: "Primeiro bar", desc: "Primeiro checkpoint com selfie.", ok: (a) => a.checks.length >= 1 },
    { id: "selfie", nome: "Rainha da selfie", desc: "10 checkpoints com selfie.", ok: (a) => a.checks.length >= 10 },
    { id: "meia", nome: "Meia Baratona", desc: "13 bares.", ok: (a) => a.checks.length >= 13 },
    { id: "completa", nome: "Baratona completa", desc: `Os ${TOTAL} bares.`, ok: (a) => a.checks.length >= TOTAL },
    { id: "pedecana", nome: "Pé de cana", desc: "5 km andados.", ok: (a) => metrosDe(a) >= 5000 },
    { id: "fofoca", nome: "Pace fofoca", desc: "40 minutos no mesmo bar.", ok: (a) => a.checks.some((c, i) => (i + 1 < a.checks.length ? a.checks[i + 1].t : tempo()) - c.t >= 40 * 60000) },
    { id: "madrugada", nome: "Até o sol raiar", desc: "Ainda na Baratona depois da meia-noite.", ok: (a) => !demo && S.status === "rodando" && S.inicioEm && new Date().getHours() < 6 && new Date().toDateString() !== new Date(S.inicioEm).toDateString() },
  ];
  const conqImg = (id) => `/conquistas/${id}.svg`;
  const metrosDe = (a) => (a === demo ? demo.metros : S.metros);
  const filaToast = []; let toastAtivo = false;
  function checaConquistas() {
    const a = demo || S; a.conq = a.conq || {};
    let nova = false;
    CONQ.forEach((c) => { if (!a.conq[c.id] && c.ok(a)) { a.conq[c.id] = Math.round(tempo()); filaToast.push(c); nova = true; } });
    if (nova) { if (!demo) salva(); mostraToast(); desenhaConquistas(); }
  }
  function mostraToast() {
    if (toastAtivo || !filaToast.length) return;
    const c = filaToast.shift(); toastAtivo = true;
    $("toast-img").src = conqImg(c.id); $("toast-nome").textContent = c.nome; $("toast-desc").textContent = c.desc;
    const t = $("toast"); t.hidden = false; t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    try { navigator.vibrate && navigator.vibrate(60); } catch {}
    setTimeout(() => { t.hidden = true; toastAtivo = false; mostraToast(); }, demo ? 2200 : 3600);
  }
  function desenhaConquistas() {
    const a = demo || S, feitas = a.conq || {}, ul = $("conq-lista"); ul.textContent = "";
    CONQ.forEach((c) => {
      const li = document.createElement("li"); const ok = !!feitas[c.id];
      li.className = ok ? "" : "bloq"; li.title = c.desc;
      const im = document.createElement("img"); im.src = conqImg(c.id); im.alt = ""; im.loading = "lazy";
      li.append(im, ok ? c.nome : "???"); ul.append(li);
    });
    $("conq-n").textContent = `${Object.keys(feitas).length} de ${CONQ.length}`;
  }

  /* ---------- drinks ---------- */
  function drink(delta) {
    const a = demo || S;
    if (!demo && S.status !== "rodando" && S.status !== "pausado") { aviso("Aperte Iniciar antes de contar os drinks."); return; }
    if (delta > 0) a.drinks.push(Math.round(tempo()));
    else if (a.drinks.length) { a.drinks.pop(); a.menos = (a.menos || 0) + 1; }
    else return;
    if (!demo) salva();
    desenhaStats(); checaConquistas(); turmaAgenda();
  }
  $("bt-mais").addEventListener("click", () => drink(1));
  $("bt-menos").addEventListener("click", () => drink(-1));

  /* ---------- tela cheia (o Straga vira app) ---------- */
  let cheiaHist = false;
  function telaCheia(on, doHistorico) {
    const app = document.querySelector(".app");
    if (app.classList.contains("cheia") === on) return;
    app.classList.toggle("cheia", on);
    document.documentElement.classList.toggle("sem-rolagem", on);
    if (on) {
      app.scrollTop = 0;
      // o "voltar" do celular fecha a tela cheia em vez de sair do site
      if (!doHistorico) { try { history.pushState({ straga: 1 }, ""); cheiaHist = true; } catch {} }
    } else if (cheiaHist && !doHistorico) { cheiaHist = false; try { history.back(); } catch {} }
    else cheiaHist = false;
    if (!on) document.querySelector(".tela").scrollIntoView({ block: "center" });
    if (mapa) setTimeout(() => mapa.resize(), 60);
  }
  window.addEventListener("popstate", () => { if (document.querySelector(".app").classList.contains("cheia")) telaCheia(false, true); });
  $("bt-voltar").addEventListener("click", () => telaCheia(false));
  $("bt-cheia").addEventListener("click", () => telaCheia(true));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !document.querySelector(".previa")) telaCheia(false); });

  /* ---------- vistas: números x mapa ---------- */
  const ICO_MAPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.2A7 7 0 0 1 19 9.8C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.6"/></svg>';
  const ICO_NUM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9"/></svg>';
  function vista(v) {
    $("tela").dataset.vista = v;
    $("bt-vista").innerHTML = v === "mapa" ? ICO_NUM : ICO_MAPA;
    $("bt-vista").setAttribute("aria-label", v === "mapa" ? "Ver os números" : "Ver o mapa");
    if (v === "mapa" && mapa) setTimeout(() => mapa.resize(), 30);
  }
  $("bt-vista").addEventListener("click", () => vista($("tela").dataset.vista === "mapa" ? "numeros" : "mapa"));

  /* ---------- mapa ---------- */
  let mapa = null, pronto = false, eu = null, segue = false, rumoAtual = null;
  const pinos = new Map();
  const linhaGeo = (c) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c } });
  function iniciaMapa() {
    if (typeof maplibregl === "undefined") { $("mapa").textContent = ""; return; }
    try {
      mapa = new maplibregl.Map({ container: "mapa", style: ESTILO, center: [-46.6905, -23.5615], zoom: 14.6, pitch: 50, bearing: -15, maxPitch: 70, attributionControl: false });
    } catch { return; }
    mapa.on("load", () => {
      mapa.addSource("plano", { type: "geojson", data: linhaGeo(PLANO) });
      mapa.addLayer({ id: "plano", type: "line", source: "plano", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FFFFFF", "line-width": 4, "line-opacity": 0.85, "line-dasharray": [1.2, 1.6] } });
      mapa.addSource("trilha", { type: "geojson", data: linhaGeo([]) });
      mapa.addLayer({ id: "trilha-borda", type: "line", source: "trilha", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#2A0E00", "line-width": 10, "line-opacity": 0.5 } });
      mapa.addLayer({ id: "trilha", type: "line", source: "trilha", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": LARANJA, "line-width": 6 } });
      BARS.forEach((x) => {
        const el = document.createElement("div"); el.className = "pino"; el.textContent = x.n; el.title = `${x.n}. ${x.nome}`;
        pinos.set(x.id, el);
        new maplibregl.Marker({ element: el }).setLngLat([x.lon, x.lat]).addTo(mapa);
      });
      pronto = true;
      desenhaTurma();
      const ult = ondeEstou();
      if (ult && (S.status === "rodando" || S.status === "pausado")) { posicaoEu(ult); segue = S.status === "rodando"; camera(ult, null, false); }
      else visaoGeral(S.status === "fim" && S.trilha.length > 1 ? S.trilha : PLANO, 0);
      desenha();
    });
    // mexeu no mapa com o dedo: para de seguir até tocar em "Seguir"
    ["dragstart", "rotatestart", "pitchstart", "zoomstart"].forEach((ev) => mapa.on(ev, (e) => {
      if (!e.originalEvent || !segue) return;
      segue = false; $("bt-centro").hidden = false;
    }));
  }
  function visaoGeral(coords, dur = 900) {
    if (!mapa || !coords || coords.length < 2) return;
    const b = new maplibregl.LngLatBounds(); coords.forEach((c) => b.extend(c));
    const cam = mapa.cameraForBounds(b, { padding: { top: 200, bottom: 50, left: 30, right: 30 }, bearing: -15 });
    if (!cam) return;
    mapa.easeTo({ center: cam.center, zoom: Math.min(cam.zoom - 0.3, 16.5), bearing: -15, pitch: 50, duration: dur });
  }
  function camera(ll, anterior, suave) {
    if (!mapa || !pronto || !segue || !ll) return;
    if (anterior && dist(anterior, ll) > 2) {
      const r = rumo(anterior, ll);
      if (rumoAtual == null) rumoAtual = r;
      else { const d = ((r - rumoAtual + 540) % 360) - 180; rumoAtual = (rumoAtual + d * (suave ? 0.08 : 0.5) + 360) % 360; }
    }
    mapa.easeTo({ center: ll, bearing: rumoAtual ?? mapa.getBearing(), pitch: 62, zoom: 16.6, duration: suave ? 160 : 900, easing: (t) => t, offset: [0, 70] });
  }
  $("bt-centro").addEventListener("click", () => {
    segue = true; $("bt-centro").hidden = true;
    const t = demo ? demo.trilha : S.trilha;
    camera(t[t.length - 1], t[t.length - 2], false);
  });

  function posicaoEu(ll) {
    if (!mapa) return;
    if (!eu) { const el = document.createElement("div"); el.className = "eu"; eu = new maplibregl.Marker({ element: el }).setLngLat(ll).addTo(mapa); }
    else eu.setLngLat(ll);
  }

  /* ---------- GPS ---------- */
  let gps = null, trava = null;
  function ligaGps() {
    if (!("geolocation" in navigator)) { aviso("Este navegador não tem GPS. Dá pra marcar os bares pela lista.", true); return; }
    gps = navigator.geolocation.watchPosition(ponto, (e) => {
      aviso(e.code === 1 ? "O GPS foi bloqueado. Libere a localização para o site nas configurações do navegador; enquanto isso, marque os bares pela lista." : "Não deu para ler o GPS agora. Continue: os checkpoints funcionam pela lista.", true);
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }
  const desligaGps = () => { if (gps != null) navigator.geolocation.clearWatch(gps); gps = null; };

  /* Celular bloqueado: o navegador não lê GPS em segundo plano (Safari e Chrome não deixam).
     O tempo continua contando pelo relógio; quando a pessoa volta, o primeiro ponto novo fica longe do
     último e o Straga completa esse trecho pelas ruas (rota a pé), em vez de uma linha reta. */
  const LACUNA = 80; // m entre dois pontos: acima disso, foi um trecho sem GPS
  let preenchendo = false;
  const metrosTxt = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
  async function rotaAPe(a, b) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`, { signal: ctl.signal });
      clearTimeout(t);
      const rt = ((await r.json()).routes || [])[0];
      if (!rt) return null;
      const reta = dist(a, b);
      if (rt.distance > reta * 3 + 300 || rt.distance > 8000) return null; // rota sem sentido: fica a linha reta
      return { coords: rt.geometry.coordinates.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]), metros: rt.distance };
    } catch { return null; }
  }
  async function ponto(p) {
    if (S.status !== "rodando" || demo) return;
    const { longitude: lon, latitude: lat, accuracy } = p.coords;
    if (accuracy > 60) return; // leitura ruim
    const ll = [+lon.toFixed(6), +lat.toFixed(6)], ult = S.trilha[S.trilha.length - 1];
    if (ult) {
      const d = dist(ult, ll);
      if (d < 6) { posicaoEu(ll); return; }
      if (d > LACUNA) {
        if (preenchendo) return;
        const sumiu = Date.now() - (S.ultimoEm || 0) > 45000; // ficou um tempo sem GPS (tela bloqueada)
        preenchendo = true; if (sumiu) aviso("Completando o trajeto de quando o celular estava bloqueado…");
        const r = await rotaAPe(ult, ll);
        preenchendo = false;
        if (S.status !== "rodando" || S.trilha[S.trilha.length - 1] !== ult) return; // pausou ou mudou no meio
        if (r) { S.trilha.push(...r.coords.slice(1, -1)); S.metros += r.metros; if (sumiu) aviso(`De volta! Completei ${metrosTxt(r.metros)} pelas ruas enquanto o celular estava bloqueado.`); }
        else { S.metros += d; if (sumiu) aviso(`De volta! Somei ${metrosTxt(d)} em linha reta (não deu para traçar pelas ruas).`); }
      } else S.metros += d;
    }
    S.trilha.push(ll); S.ultimoEm = Date.now();
    posicaoEu(ll); camera(ll, ult, false); salva(); desenha(); checaConquistas();
  }
  // voltou para a tela: religa o GPS (o iOS às vezes larga o watch) e pede a posição na hora
  function voltou() {
    if (document.hidden || S.status !== "rodando" || demo) return;
    acordado(true); desenhaStats();
    if (!("geolocation" in navigator)) return;
    desligaGps(); ligaGps();
    navigator.geolocation.getCurrentPosition(ponto, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    setTimeout(() => sincroniza(true), 4000);
  }
  async function acordado(on) {
    try { if (on && "wakeLock" in navigator && !trava) { trava = await navigator.wakeLock.request("screen"); trava.addEventListener("release", () => (trava = null)); } } catch {}
    if (!on && trava) { trava.release().catch(() => {}); trava = null; }
  }
  document.addEventListener("visibilitychange", voltou);
  window.addEventListener("pageshow", (e) => { if (e.persisted) voltou(); });

  /* ---------- bar mais perto ---------- */
  function ondeEstou() {
    const t = demo ? demo.trilha : S.trilha;
    return t.length ? t[t.length - 1] : null;
  }
  function preencheBares() {
    const feitos = new Set((demo ? demo.checks : S.checks).map((c) => c.id));
    const aqui = ondeEstou();
    let lista = BARS.filter((b) => !feitos.has(b.id)).map((b) => ({ b, d: aqui ? dist(aqui, [b.lon, b.lat]) : null }));
    if (aqui) lista.sort((a, z) => a.d - z.d);
    const sel = $("bar-sel"), antes = sel.value; sel.textContent = "";
    lista.forEach(({ b, d }) => {
      const o = document.createElement("option"); o.value = b.id;
      o.textContent = `${b.n}. ${b.nome}${d != null ? (d < 1000 ? ` · ${Math.round(d)} m` : ` · ${(d / 1000).toFixed(1).replace(".", ",")} km`) : ""}`;
      sel.append(o);
    });
    if (antes && lista.some((x) => x.b.id === antes) && !(aqui && lista[0] && lista[0].d < RAIO)) sel.value = antes;
    const p = lista[0];
    $("perto-txt").textContent = !lista.length ? "Todos os bares marcados! 🎉" : p && p.d != null && p.d < RAIO ? `Você está no ${p.b.nome}?` : p && p.d != null && p.d < PERTO ? "Bar mais perto" : "Escolha o bar";
    $("bt-selfie").disabled = !lista.length;
  }

  /* ---------- selfie ---------- */
  function reduz(arquivo) {
    return new Promise((ok, erro) => {
      const url = URL.createObjectURL(arquivo), im = new Image();
      im.onload = () => {
        const L = 420, s = Math.min(im.width, im.height), c = document.createElement("canvas"); c.width = c.height = L;
        c.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, L, L);
        URL.revokeObjectURL(url); ok(c.toDataURL("image/jpeg", 0.72));
      };
      im.onerror = () => { URL.revokeObjectURL(url); erro(new Error("Não deu para abrir a foto.")); };
      im.src = url;
    });
  }
  const abreCamera = () => { preencheBares(); if (!$("bar-sel").value) return; $("arquivo").value = ""; $("arquivo").click(); };
  $("bt-selfie").addEventListener("click", abreCamera);
  $("bt-foto").addEventListener("click", abreCamera);
  $("arquivo").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const b = BARS.find((x) => x.id === $("bar-sel").value); if (!b) return;
    try {
      const selfie = await reduz(f);
      marca(b, selfie);
      if (typeof Sessao !== "undefined" && Sessao.token && typeof api === "function") api("/api/checkin", { bar: b.id, barNome: b.nome }).catch(() => {});
    } catch (err) { aviso(err.message, true); }
  });
  function marca(b, selfie) {
    const alvo = demo ? demo.checks : S.checks;
    if (alvo.some((c) => c.id === b.id)) return;
    alvo.push({ id: b.id, n: b.n, nome: b.nome, t: tempo(), selfie });
    if (!demo) salva();
    aviso(`Checkpoint no ${b.nome}! ${alvo.length} de ${TOTAL} 🍻`);
    desenha(); checaConquistas(); turmaAgenda();
  }

  /* ---------- controles ---------- */
  let tique = null;
  function roda() { clearInterval(tique); let n = 0; tique = setInterval(() => { desenhaStats(); if (++n % 30 === 0) checaConquistas(); }, 1000); }
  $("bt-play").addEventListener("click", () => {
    if (demo) paraDemo();
    if (S.status === "parado" || S.status === "pausado") {
      if (S.status === "parado") { S = { ...novo(), status: "rodando", desde: Date.now(), inicioEm: Date.now() }; aviso("Valendo! O trajeto aparece em laranja no mapa."); }
      else { S.status = "rodando"; S.desde = Date.now(); aviso("De volta à Baratona."); }
      segue = true; $("bt-centro").hidden = true;
      if (S.status === "rodando" && !S.acum) vista("numeros");
      telaCheia(true);
      ligaGps(); acordado(true); roda();
    } else if (S.status === "rodando") {
      S.acum += Date.now() - S.desde; S.status = "pausado"; desligaGps(); acordado(false); aviso("Pausado. O tempo parou.");
    }
    salva(); desenha(); turmaAgenda();
  });
  $("bt-fim").addEventListener("click", () => {
    if (demo) { paraDemo(); telaCheia(false); desenha(); return; } // Finalizar na demonstração: sai da demo e volta ao site
    if (S.status === "rodando") S.acum += Date.now() - S.desde;
    S.status = "fim"; desligaGps(); acordado(false); clearInterval(tique); segue = false; $("bt-centro").hidden = true; vista("mapa");
    visaoGeral(S.trilha.length > 1 ? S.trilha : PLANO); salva(); desenha(); turmaAgenda();
    setTimeout(() => $("resumo").scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  });
  $("bt-zera").addEventListener("click", () => {
    if (demo) { paraDemo(); desenha(); return; }
    const bt = $("bt-zera");
    if (bt.dataset.certeza !== "1") { bt.dataset.certeza = "1"; bt.textContent = "Apagar atividade? Toque de novo"; setTimeout(() => { bt.dataset.certeza = ""; bt.textContent = "Recomeçar"; }, 4000); return; }
    bt.dataset.certeza = ""; bt.textContent = "Recomeçar";
    S = novo(); salva(); if (eu) { eu.remove(); eu = null; } visaoGeral(PLANO); vista("mapa"); aviso(AVISO_INICIO()); desenha(); desenhaConquistas(); turmaAgenda();
  });
  $("bt-kudos").addEventListener("click", () => { const a = demo || S; a.kudos = (a.kudos || 0) + 1; if (!demo) salva(); desenha(); });

  /* ---------- demonstração ---------- */
  const FOTOS = ["/arte/foto-beijo.webp", "/arte/foto-boia.webp", "/arte/foto-gatinho.webp", "/arte/ceci-boia.webp", "/arte/spritz.webp", "/arte/cerejas.webp", "/arte/onca.webp", "/arte/tarot.webp"];
  $("bt-demo").addEventListener("click", () => {
    if (S.status === "rodando") { aviso("Você está com uma atividade rodando. Pause ou finalize antes da demonstração.", true); return; }
    telaCheia(true);
    comecaDemo();
  });
  function comecaDemo() {
    paraDemo();
    const linha = PLANO;
    const acum = [0]; for (let i = 1; i < linha.length; i++) acum.push(acum[i - 1] + dist(linha[i - 1], linha[i]));
    const total = acum[acum.length - 1], DUR = 45000, JORNADA = (10 * 60 + 25) * 60000; // 13h → 23h25
    const ini = performance.now();
    const ordem = BARS.map((b) => { let m = 0, best = Infinity; linha.forEach((p, i) => { const d = dist(p, [b.lon, b.lat]); if (d < best) { best = d; m = acum[i]; } }); return { b, m }; });
    demo = { trilha: [], checks: [], relogio: 0, metros: 0, kudos: 0, fim: false, inicio: 13, drinks: [], menos: 0, conq: {} };
    vista("mapa"); desenhaConquistas();
    $("demo-selo").hidden = false;
    segue = true; rumoAtual = null; $("bt-centro").hidden = true;
    let k = 0, f = 0;
    demo.tick = setInterval(() => {
      const fr = Math.min(1, (performance.now() - ini) / DUR), alvo = fr * total;
      while (k < linha.length && acum[k] <= alvo) { demo.trilha.push(linha[k]); k++; }
      // ponto interpolado entre dois vértices: a câmera anda sem tranco
      let aqui = demo.trilha[demo.trilha.length - 1];
      if (k > 0 && k < linha.length) { const a = linha[k - 1], b = linha[k], t = (alvo - acum[k - 1]) / (acum[k] - acum[k - 1] || 1); aqui = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
      demo.metros = alvo; demo.relogio = fr * JORNADA;
      if (aqui) { posicaoEu(aqui); camera(aqui, demo.ant, true); demo.ant = aqui; demo.aqui = aqui; }
      ordem.forEach(({ b, m }) => {
        if (m <= alvo && !demo.checks.some((c) => c.id === b.id)) {
          marca(b, FOTOS[f++ % FOTOS.length]);
          drink(1); if (b.n % 3 === 0 || (b.n >= 4 && b.n <= 6)) drink(1); // uns bares rendem dois
          if (b.n === 9) drink(-1);
        }
      });
      if (fr >= 1) { demo.fim = true; clearInterval(demo.tick); segue = false; visaoGeral(demo.trilha, 1600); aviso("Fim da demonstração. Lá embaixo está a atividade que sai no final."); }
      desenha();
    }, 120);
    aviso("Demonstração: 10 horas de Baratona em 45 segundos.");
    desenha();
  }
  function paraDemo() {
    if (!demo) return; clearInterval(demo.tick); demo = null; $("demo-selo").hidden = true; segue = false; $("bt-centro").hidden = true;
    filaToast.length = 0; $("toast").hidden = true; toastAtivo = false; desenhaConquistas();
    if (eu) { eu.remove(); eu = null; }
    const ult = S.trilha[S.trilha.length - 1]; if (ult) posicaoEu(ult);
    visaoGeral(S.trilha.length > 1 ? S.trilha : PLANO);
    aviso(S.status === "parado" ? AVISO_INICIO() : "");
  }

  /* ---------- tela ---------- */
  function proximoBar() {
    const a = demo || S, feitos = new Set(a.checks.map((c) => c.id)), aqui = ondeEstou();
    const resto = BARS.filter((b) => !feitos.has(b.id));
    if (!resto.length) return null;
    if (!aqui) return { b: resto[0], d: null };
    return resto.map((b) => ({ b, d: dist(aqui, [b.lon, b.lat]) })).sort((x, z) => x.d - z.d)[0];
  }
  function desenhaStats() {
    const a = demo || S, n = a.checks.length, t = tempo(), m = demo ? demo.metros : S.metros, dr = a.drinks.length;
    const [v, u] = tempoCurto(t);
    $("s-tempo").textContent = v; $("s-tempo-u").textContent = u;
    $("s-drinks").textContent = dr; $("s-drinks-u").textContent = `em ${n} ${n === 1 ? "bar" : "bares"}`;
    $("s-dist").textContent = kmN(m); $("s-bares").textContent = `${n}/${TOTAL}`;
    $("n-tempo").textContent = relogio(t); $("n-drinks").textContent = dr; $("n-km").textContent = kmN(m);
    $("n-media").textContent = t >= 10 * 60000 ? (dr / (t / 3600000)).toFixed(1).replace(".", ",") : "–";
    $("n-bares").textContent = `${n} de ${TOTAL}`;
    const ult = a.drinks[a.drinks.length - 1];
    $("n-ultimo").textContent = ult == null ? "–" : (t - ult < 60000 ? "agora" : `há ${hhmm(t - ult)}`);
    const p = proximoBar();
    $("n-prox-l").textContent = p ? "Próximo bar" : "Fim da lista";
    $("n-prox").textContent = p ? `${p.b.nome.length > 16 ? p.b.nome.slice(0, 15) + "…" : p.b.nome}${p.d != null ? ` · ${p.d < 1000 ? Math.round(p.d) + " m" : (p.d / 1000).toFixed(1).replace(".", ",") + " km"}` : ""}` : "🎉";
  }
  function desenha() {
    const a = demo || S, st = demo ? (demo.fim ? "fim" : "rodando") : S.status;
    desenhaStats();
    $("estado").classList.toggle("on", st === "rodando");
    $("estado-txt").textContent = demo ? (demo.fim ? "Demo: fim" : "Demo") : { parado: "Parado", rodando: "Gravando", pausado: "Pausado", fim: "Finalizado" }[st];
    const play = $("bt-play");
    play.hidden = st === "fim" && !demo;
    const ICO_PAUSA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1"/><rect x="13.8" y="5" width="4.2" height="14" rx="1"/></svg>';
    const ICO_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5Z"/></svg>';
    if (!demo && st === "rodando") { play.innerHTML = ICO_PAUSA; play.setAttribute("aria-label", "Pausar"); }
    else if (!demo && st === "pausado") { play.innerHTML = ICO_PLAY; play.setAttribute("aria-label", "Retomar"); }
    else { play.textContent = "Iniciar"; play.removeAttribute("aria-label"); }
    $("bt-foto").hidden = !!demo || !(st === "rodando" || st === "pausado");
    $("bt-fim").hidden = demo ? demo.fim : st !== "pausado";
    $("bt-demo").hidden = !!demo || S.status === "rodando";
    $("perto").hidden = !(st === "rodando" || st === "pausado") || !!demo;
    if (!$("perto").hidden) preencheBares();

    if (pronto) {
      mapa.getSource("trilha").setData(linhaGeo(demo && demo.aqui && !demo.fim ? a.trilha.concat([demo.aqui]) : a.trilha));
      const feitos = new Map(a.checks.map((c) => [c.id, c]));
      pinos.forEach((el, id) => {
        const c = feitos.get(id);
        el.classList.toggle("feito", !!c);
        el.style.backgroundImage = c && c.selfie ? `url("${c.selfie}")` : "";
      });
    }
    // feed
    const ol = $("feed"); ol.textContent = "";
    a.checks.slice().reverse().forEach((c) => {
      const li = document.createElement("li");
      const im = document.createElement("img"); im.src = c.selfie; im.alt = `Selfie no ${c.nome}`; im.loading = "lazy";
      const tx = document.createElement("div"); const b = document.createElement("b"); b.textContent = `${c.n}. ${c.nome}`;
      const sp = document.createElement("span"); sp.textContent = "Checkpoint"; tx.append(b, sp);
      const em = document.createElement("em"); em.textContent = relogio(c.t);
      li.append(im, tx, em); ol.append(li);
    });
    $("feed-vazio").hidden = a.checks.length > 0;
    // resumo
    const fim = demo ? demo.fim : S.status === "fim";
    $("resumo").hidden = !fim;
    if (fim) {
      const t = tempo(), n = a.checks.length;
      $("r-titulo").textContent = demo ? "Baratona da Ceci (demo)" : "Baratona da Ceci";
      $("r-sub").textContent = (demo ? "28/11 · Pinheiros e Vila Madalena" : `${new Date(S.inicioEm || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${hhmm(t)} de Baratona`);
      $("r-tempo").textContent = relogio(t); $("r-dist").textContent = km(demo ? demo.metros : S.metros);
      $("r-bares").textContent = `${n}/${TOTAL}`; $("r-drinks").textContent = a.drinks.length;
      const rc = $("r-conq"); rc.textContent = "";
      CONQ.filter((c) => (a.conq || {})[c.id]).forEach((c) => { const im = document.createElement("img"); im.src = conqImg(c.id); im.alt = c.nome; im.title = c.nome; rc.append(im); });
      const g = $("r-grade"); g.textContent = "";
      a.checks.forEach((c) => { const im = document.createElement("img"); im.src = c.selfie; im.alt = `Selfie no ${c.nome}`; im.loading = "lazy"; g.append(im); });
      $("kudos-n").textContent = a.kudos ? `${a.kudos} ${a.kudos === 1 ? "saúde" : "saúdes"}` : "";
    }
  }

  /* ---------- imagem da atividade (1080x1920, estilo flyover) ---------- */
  const carrega = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // STRAGA à esquerda, logo da Baratona à direita, centralizados como um par
  function cabecalho(g, W, cy, marcaImg, logoImg, corFio) {
    const mh = 78, mw = marcaImg ? (marcaImg.width / marcaImg.height) * mh : 0;
    const lh = 128, lw = logoImg ? (logoImg.width / logoImg.height) * lh : 0;
    const gap = 34, fio = 4, total = mw + (logoImg ? gap * 2 + fio + lw : 0);
    let x = (W - total) / 2;
    if (marcaImg) g.drawImage(marcaImg, x, cy - mh / 2, mw, mh);
    if (!logoImg) return;
    x += mw + gap; g.fillStyle = corFio; g.fillRect(x, cy - 46, fio, 92);
    x += fio + gap; g.drawImage(logoImg, x, cy - lh / 2, lw, lh);
  }

  // satélite inclinado fora da tela; devolve o canvas e a projeção lng/lat -> pixel
  function fundoSatelite(coords, W, H) {
    return new Promise((resolve) => {
      if (typeof maplibregl === "undefined") return resolve(null);
      const box = document.createElement("div");
      box.style.cssText = `position:fixed;left:-20000px;top:0;width:${W / 2}px;height:${H / 2}px;pointer-events:none`;
      document.body.append(box);
      let m, feito = false;
      const fim = (r) => { if (feito) return; feito = true; clearTimeout(t); try { m && m.remove(); } catch {} box.remove(); resolve(r); };
      const t = setTimeout(() => fim(captura()), 20000);
      function captura() {
        try {
          const c = m.getCanvas(), out = document.createElement("canvas"); out.width = W; out.height = H;
          out.getContext("2d").drawImage(c, 0, 0, W, H);
          out.toDataURL("image/png").slice(0, 32); // erro se o canvas ficou "sujo" (CORS)
          const z = m.getZoom(), cen = m.getCenter(), b = m.getBearing(), p = m.getPitch();
          return { canvas: out, projeta: (ll) => { const q = m.project(ll); return [q.x * 2, q.y * 2]; }, cam: { z, cen, b, p } };
        } catch { return null; }
      }
      try {
        m = new maplibregl.Map({ container: box, style: ESTILO, pixelRatio: 2, interactive: false, attributionControl: false, preserveDrawingBuffer: true, fadeDuration: 0, maxPitch: 70 });
      } catch { return fim(null); }
      m.on("error", () => {});
      m.once("load", () => {
        const b = new maplibregl.LngLatBounds(); coords.forEach((c) => b.extend(c));
        const cam = m.cameraForBounds(b, { padding: { top: 380, bottom: 170, left: 50, right: 50 }, bearing: -15 });
        m.jumpTo({ center: cam ? cam.center : coords[0], zoom: cam ? cam.zoom : 15, bearing: -15, pitch: 55 });
        // com a inclinação o traçado cresce embaixo: afasta até caber na área livre
        const cabe = () => coords.every((c) => { const q = m.project(c); return q.x > 30 && q.x < W / 2 - 30 && q.y > 340 && q.y < H / 2 - 150; });
        for (let i = 0; i < 12 && !cabe(); i++) m.jumpTo({ zoom: m.getZoom() - 0.15 });
        m.once("idle", () => fim(captura()));
      });
    });
  }

  async function imagem() {
    const a = demo || S, W = 1080, H = 1920;
    const trilha = a.trilha.length > 1 ? a.trilha : PLANO;
    await Promise.all(['700 120px "Barlow"', '600 44px "Barlow"', '500 36px "Barlow"'].map((f) => document.fonts.load(f))).catch(() => {});
    const fundo = await fundoSatelite(trilha, W, H);
    if (!fundo) return imagemPapel();
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.drawImage(fundo.canvas, 0, 0);
    // escurece o topo e a base para o texto
    let gr = g.createLinearGradient(0, 0, 0, 860);
    gr.addColorStop(0, "rgba(0,0,0,.66)"); gr.addColorStop(0.55, "rgba(0,0,0,.32)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, 860);
    gr = g.createLinearGradient(0, H - 380, 0, H);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.62)");
    g.fillStyle = gr; g.fillRect(0, H - 380, W, 380);

    // trajeto
    const pts = trilha.map(fundo.projeta);
    g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = "rgba(42,14,0,.55)"; g.lineWidth = 24; g.stroke();
    g.strokeStyle = LARANJA; g.lineWidth = 14; g.stroke();

    // selfies nos bares
    const fotos = await Promise.all(a.checks.map((ck) => carrega(ck.selfie)));
    a.checks.forEach((ck, i) => {
      const b = BARS.find((x) => x.id === ck.id); if (!b) return;
      const [x, y] = fundo.projeta([b.lon, b.lat]), r = 30, im = fotos[i];
      g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.beginPath(); g.arc(x, y, r + 6, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.restore();
      g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
      if (im) { const s = Math.min(im.width, im.height); g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, x - r, y - r, r * 2, r * 2); }
      else { g.fillStyle = LARANJA; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.restore();
    });
    // ponto final: laranja com aro branco
    const [ex, ey] = pts[pts.length - 1];
    g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 10;
    g.beginPath(); g.arc(ex, ey, 24, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.restore();
    g.beginPath(); g.arc(ex, ey, 15, 0, Math.PI * 2); g.fillStyle = LARANJA; g.fill();

    // marca, título e números
    g.save(); g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 8; g.shadowOffsetY = 2;
    const [marcaImg, logoImg] = await Promise.all([carrega("/straga-marca-branca.svg"), carrega("/arte/logo.webp")]);
    cabecalho(g, W, 175, marcaImg, logoImg, "rgba(255,255,255,.6)");
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "alphabetic";
    const t = tempo(), n = a.checks.length, m = demo ? demo.metros : S.metros;
    const [tv, tu] = tempoCurto(t);
    [["Tempo", tv, tu], ["Drinks", String(a.drinks.length), `em ${n} ${n === 1 ? "bar" : "bares"}`], ["Distância", kmN(m), "km"]].forEach(([k, v, u], i) => {
      const x = (W / 6) * (1 + i * 2);
      g.font = '500 38px "Barlow", system-ui, sans-serif'; g.fillText(k, x, 380);
      g.font = '700 118px "Barlow", system-ui, sans-serif'; g.fillText(v, x, 500);
      g.font = '700 42px "Barlow", system-ui, sans-serif'; g.fillText(u, x, 564);
    });
    // rodapé
    g.textAlign = "left"; g.font = '700 36px "Barlow", system-ui, sans-serif';
    g.fillText(`${n} de ${TOTAL} bares`, 60, H - 120);
    g.font = '500 30px "Barlow", system-ui, sans-serif';
    g.fillText("28/11 · Baratona da Ceci · Pinheiros e Vila Madalena", 60, H - 72);
    g.restore();
    // conquistas desbloqueadas
    const ganhas = CONQ.filter((cq) => (a.conq || {})[cq.id]).slice(0, 8);
    const imgs = await Promise.all(ganhas.map((cq) => carrega(conqImg(cq.id))));
    const lado = 96, gap = 14;
    imgs.forEach((im, i) => {
      if (!im) return;
      const x = 60 + i * (lado + gap), y = H - 300;
      g.save(); g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 12; g.shadowOffsetY = 4;
      g.drawImage(im, x, y, lado, lado); g.restore();
    });
    g.textAlign = "right"; g.font = '500 18px "Barlow", system-ui, sans-serif'; g.fillStyle = "rgba(255,255,255,.75)";
    g.fillText(CREDITO, W - 24, H - 24);
    return new Promise((ok) => c.toBlob(ok, "image/png"));
  }

  // plano B (sem mapa): trajeto desenhado sobre o papel
  async function imagemPapel() {
    const a = demo || S, W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#F5E9D4"; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(42,29,34,.06)"; for (let y = 0; y < H; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < W; x += 14) g.fillRect(x, y, 2, 2);
    const [marcaImg, logoImg] = await Promise.all([carrega("/straga-marca.svg"), carrega("/arte/logo-vermelho.webp")]);
    cabecalho(g, W, 140, marcaImg, logoImg, "rgba(42,29,34,.35)");
    const t = tempo(), n = a.checks.length, m = demo ? demo.metros : S.metros;
    const [tv, tu] = tempoCurto(t);
    g.fillStyle = "#242428"; g.textAlign = "center";
    [["Tempo", tv, tu], ["Drinks", String(a.drinks.length), `em ${n} bares`], ["Distância", kmN(m), "km"]].forEach(([k, v, u], i) => {
      const x = (W / 6) * (1 + i * 2);
      g.font = '500 36px "Barlow", sans-serif'; g.fillText(k, x, 300);
      g.font = '700 110px "Barlow", sans-serif'; g.fillText(v, x, 410);
      g.font = '700 40px "Barlow", sans-serif'; g.fillText(u, x, 470);
    });
    const box = { x: 60, y: 540, w: 960, h: 1220 };
    const tr = a.trilha.length > 1 ? a.trilha : PLANO;
    const pts = [...tr, ...BARS.map((b) => [b.lon, b.lat])];
    const merc = ([lo, la]) => [lo, -Math.log(Math.tan(Math.PI / 4 + rad(la) / 2)) * 180 / Math.PI];
    const ms = pts.map(merc), xs = ms.map((p) => p[0]), ys = ms.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 60;
    const k = Math.min((box.w - pad * 2) / (x1 - x0 || 1), (box.h - pad * 2) / (y1 - y0 || 1));
    const ox = box.x + (box.w - (x1 - x0) * k) / 2, oy = box.y + (box.h - (y1 - y0) * k) / 2;
    const P = (ll) => { const [x, y] = merc(ll); return [ox + (x - x0) * k, oy + (y - y0) * k]; };
    g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); tr.map(P).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = "#2A1D22"; g.lineWidth = 16; g.stroke(); g.strokeStyle = LARANJA; g.lineWidth = 10; g.stroke();
    const feitos = new Set(a.checks.map((ck) => ck.id));
    BARS.forEach((b) => { const [x, y] = P([b.lon, b.lat]); g.beginPath(); g.arc(x, y, feitos.has(b.id) ? 12 : 8, 0, Math.PI * 2); g.fillStyle = feitos.has(b.id) ? LARANJA : "#C9B9A3"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke(); });
    g.textAlign = "center"; g.font = '700 32px "Barlow", sans-serif'; g.fillStyle = "#242428";
    g.fillText(`${n} de ${TOTAL} bares · 28/11 · Baratona da Ceci`, W / 2, H - 80);
    return new Promise((ok) => c.toBlob(ok, "image/png"));
  }

  $("bt-baixar").addEventListener("click", async () => {
    const bt = $("bt-baixar"); bt.disabled = true; const r = bt.textContent; bt.textContent = "Gerando…";
    try {
      const blob = await imagem(); if (!blob) throw new Error();
      const url = URL.createObjectURL(blob), nome = "straga-baratona-da-ceci.png", arq = new File([blob], nome, { type: "image/png" });
      const v = document.createElement("div"); v.className = "previa"; v.setAttribute("role", "dialog"); v.setAttribute("aria-label", "Imagem da atividade");
      const im = document.createElement("img"); im.src = url; im.alt = "Sua atividade no Straga";
      const linha = document.createElement("div"); linha.className = "linha";
      const a = document.createElement("a"); a.className = "bt laranja"; a.href = url; a.download = nome; a.textContent = "⬇ Baixar imagem"; linha.append(a);
      if (navigator.canShare && navigator.canShare({ files: [arq] })) { const s = document.createElement("button"); s.className = "bt"; s.type = "button"; s.textContent = "Compartilhar"; s.onclick = () => navigator.share({ files: [arq] }).catch(() => {}); linha.append(s); }
      const p = document.createElement("p"); p.textContent = "No celular, dá pra segurar a imagem para salvar nas fotos.";
      const f = document.createElement("button"); f.className = "fecha"; f.type = "button"; f.textContent = "Fechar";
      const sai = () => { v.remove(); URL.revokeObjectURL(url); bt.focus(); };
      f.onclick = sai; v.onclick = (e) => { if (e.target === v) sai(); };
      v.append(im, linha, p, f); document.body.append(v); a.focus();
    } catch { aviso("Não deu para gerar a imagem.", true); }
    bt.disabled = false; bt.textContent = r;
  });

  /* ---------- turma: nome, amigos no mapa e ranking ---------- */
  const novoId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, "0")).join("");
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
  let meuId = ls("straga-id"); if (!/^[a-f0-9]{32}$/.test(meuId || "")) { meuId = novoId(); ls("straga-id", meuId); }
  let meuNome = ls("straga-nome") || "";
  let partilha = ls("straga-partilha") !== "0";
  let meuCod = ls("straga-eu") || null, turma = [];
  const amigos = new Map();
  $("nome-turma").value = meuNome || (typeof Sessao !== "undefined" ? Sessao.nome : "") || "";
  $("partilha").checked = partilha;
  if (meuNome) $("bt-nome").textContent = "Salvo";
  $("nome-turma").addEventListener("input", () => { $("bt-nome").textContent = meuNome ? "Salvar" : "Entrar"; });
  $("nome-turma").addEventListener("keydown", (e) => { if (e.key === "Enter") $("bt-nome").click(); });
  $("bt-nome").addEventListener("click", async () => {
    const n = $("nome-turma").value.replace(/\s+/g, " ").trim().slice(0, 24);
    if (!n) { $("nome-turma").focus(); return; }
    meuNome = n; ls("straga-nome", n); $("bt-nome").textContent = "Salvo"; $("nome-turma").blur();
    await sincroniza(true);
  });
  $("partilha").addEventListener("change", () => { partilha = $("partilha").checked; ls("straga-partilha", partilha ? "1" : "0"); sincroniza(true); });
  let envioPendente = null, sincronizando = false;
  function turmaAgenda() { if (demo) return; clearTimeout(envioPendente); envioPendente = setTimeout(() => sincroniza(true), 2500); }
  async function sincroniza(enviar) {
    if (sincronizando || document.hidden) return;
    sincronizando = true;
    try {
      let r;
      if (enviar && meuNome && !demo) {
        const ult = S.trilha[S.trilha.length - 1];
        r = await fetch("/api/straga", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          id: meuId, nome: meuNome, partilha, status: S.status, pos: partilha && S.status === "rodando" && ult ? ult : null,
          bares: S.checks.length, drinks: S.drinks.length, metros: Math.round(S.metros), conq: Object.keys(S.conq || {}).length }) });
      } else r = await fetch("/api/straga", { cache: "no-store" });
      const j = await r.json();
      if (r.ok) { turma = j.turma || []; if (j.eu) { meuCod = j.eu; ls("straga-eu", meuCod); } desenhaTurma(); }
    } catch {} finally { sincronizando = false; }
  }
  const inicial = (n) => (n || "?").trim().charAt(0).toUpperCase();
  function desenhaTurma() {
    // amigos no mapa: só quem está gravando e deixou mostrar
    if (pronto) {
      const vivos = new Set();
      turma.forEach((p) => {
        if (!p.pos || p.cod === meuCod) return;
        vivos.add(p.cod);
        let m = amigos.get(p.cod);
        if (!m) {
          const el = document.createElement("div"); el.className = "amigo";
          el.append(document.createElement("i"), document.createElement("span"));
          m = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(p.pos).addTo(mapa); amigos.set(p.cod, m);
        }
        const el = m.getElement();
        el.querySelector("i").textContent = inicial(p.nome); el.querySelector("span").textContent = p.nome;
        el.title = `${p.nome} · há ${Math.max(1, Math.round(p.ha / 60))} min`;
        m.setLngLat(p.pos);
      });
      amigos.forEach((m, c) => { if (!vivos.has(c)) { m.remove(); amigos.delete(c); } });
    }
    // ranking: bares, depois conquistas, depois quilômetros
    const lista = turma.slice().sort((a, b) => b.bares - a.bares || b.conq - a.conq || b.metros - a.metros || String(a.nome).localeCompare(b.nome, "pt"));
    const ol = $("ranking"); ol.textContent = "";
    lista.slice(0, 40).forEach((p, k) => {
      const li = document.createElement("li"); if (p.cod === meuCod) li.className = "sou-eu";
      const pos = document.createElement("span"); pos.className = "pos"; pos.textContent = `${k + 1}º`;
      const av = document.createElement("span"); av.className = "av" + (p.status === "rodando" && p.ha < 300 ? " vivo" : ""); av.textContent = inicial(p.nome);
      const tx = document.createElement("div"); const b = document.createElement("b"); b.textContent = p.cod === meuCod ? `${p.nome} (você)` : p.nome;
      const sm = document.createElement("small"); sm.textContent = `${p.conq} ${p.conq === 1 ? "conquista" : "conquistas"} · ${kmN(p.metros)} km · ${p.drinks} 🍸`; tx.append(b, sm);
      const em = document.createElement("em"); em.textContent = p.bares; const es = document.createElement("span"); es.textContent = p.bares === 1 ? "bar" : "bares"; em.append(es);
      li.append(pos, av, tx, em); ol.append(li);
    });
    const gravando = turma.filter((p) => p.status === "rodando" && p.ha < 300).length;
    $("turma-n").textContent = turma.length ? `${turma.length} na turma${gravando ? ` · ${gravando} gravando agora` : ""}` : "–";
    $("ranking-vazio").hidden = turma.length > 0;
  }
  setInterval(() => sincroniza(!!meuNome && (S.status === "rodando" || S.status === "pausado")), 20000);

  /* ---------- início ---------- */
  iniciaMapa();
  vista(S.status === "rodando" || S.status === "pausado" ? "numeros" : "mapa");
  if (S.status === "rodando" || S.status === "pausado") telaCheia(true); // voltou no meio da Baratona: direto no app
  desenhaConquistas();
  sincroniza(!!meuNome && S.status !== "parado");
  if (S.status === "rodando") { segue = true; ligaGps(); acordado(true); roda(); aviso("Atividade em andamento. O cronômetro não parou."); }
  else if (S.status === "pausado") aviso("Atividade pausada. Aperte Voltar para continuar.");
  else if (S.status === "parado") aviso(AVISO_INICIO());
  desenha();
})();
