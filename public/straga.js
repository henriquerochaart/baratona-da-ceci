/* Straga: cronômetro + GPS + checkpoint com selfie, tudo no celular (localStorage).
   Modo demonstração: percorre o PERCURSO.linha acelerado, com selfies de exemplo. */
(function () {
  const $ = (id) => document.getElementById(id);
  const CHAVE = "straga-atividade";
  const RAIO = 80; // metros para sugerir um bar como "aqui"
  const PERTO = 400;

  /* ---------- paradas do percurso ---------- */
  const idx = new Map(BARES.map((b) => [b.id, b]));
  const BARS = PERCURSO.paradas.map((p, i) => {
    const b = idx.get(p.id) || {};
    return { id: p.id, n: i + 1, hora: p.hora, nome: p.nome || b.nome, end: p.end || b.end, lat: p.lat ?? b.lat, lon: p.lon ?? b.lon };
  }).filter((b) => b.nome && typeof b.lat === "number");
  const TOTAL = BARS.length;

  /* ---------- utilitários ---------- */
  const R = 6371000, rad = (g) => (g * Math.PI) / 180;
  const dist = ([lo1, la1], [lo2, la2]) => {
    const a = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  const relogio = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  const km = (m) => (m / 1000).toFixed(2).replace(".", ",") + " km";
  const pace = (ms, n) => (n ? Math.round(ms / n / 60000) + "′/bar" : "–");
  const hhmm = (ms) => { const m = Math.floor(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} min`; };

  /* ---------- estado ---------- */
  const novo = () => ({ status: "parado", acum: 0, desde: 0, inicioEm: 0, trilha: [], metros: 0, checks: [], kudos: 0 });
  let S = novo(), demo = null;
  try { const s = JSON.parse(localStorage.getItem(CHAVE) || "null"); if (s && s.status) S = { ...novo(), ...s }; } catch {}
  const salva = () => { if (demo) return; try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch { aviso("O celular não deixou salvar. Se fechar a página, a atividade se perde.", true); } };
  const tempo = () => (demo ? demo.relogio : S.acum + (S.status === "rodando" ? Date.now() - S.desde : 0));

  function aviso(t, erro) { const a = $("aviso"); a.textContent = t; a.classList.toggle("erro", !!erro); }

  /* ---------- mapa ---------- */
  let mapa = null, pronto = false, eu = null;
  const pinos = new Map();
  function iniciaMapa() {
    if (typeof maplibregl === "undefined") { $("mapa").textContent = ""; return; }
    try {
      mapa = new maplibregl.Map({ container: "mapa", style: "https://tiles.openfreemap.org/styles/liberty", center: [-46.6905, -23.5615], zoom: 14.3, attributionControl: { compact: true } });
    } catch { return; }
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapa.on("load", () => {
      mapa.addSource("plano", { type: "geojson", data: linhaGeo(PERCURSO.linha || BARS.map((b) => [b.lon, b.lat])) });
      mapa.addLayer({ id: "plano", type: "line", source: "plano", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#6A5258", "line-width": 3, "line-opacity": 0.45, "line-dasharray": [1.5, 1.5] } });
      mapa.addSource("trilha", { type: "geojson", data: linhaGeo([]) });
      mapa.addLayer({ id: "trilha-borda", type: "line", source: "trilha", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FCF6EA", "line-width": 9 } });
      mapa.addLayer({ id: "trilha", type: "line", source: "trilha", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FC4C02", "line-width": 5 } });
      const b = new maplibregl.LngLatBounds(); BARS.forEach((x) => b.extend([x.lon, x.lat]));
      mapa.fitBounds(b, { padding: 36, duration: 0 });
      BARS.forEach((x) => {
        const el = document.createElement("div"); el.className = "pino"; el.textContent = x.n; el.title = `${x.n}. ${x.nome}`;
        pinos.set(x.id, el);
        new maplibregl.Marker({ element: el }).setLngLat([x.lon, x.lat]).addTo(mapa);
      });
      pronto = true; desenha();
    });
  }
  const linhaGeo = (c) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c } });

  function posicaoEu(ll) {
    if (!mapa) return;
    if (!eu) { const el = document.createElement("div"); el.className = "eu"; eu = new maplibregl.Marker({ element: el }).setLngLat(ll).addTo(mapa); }
    else eu.setLngLat(ll);
  }

  /* ---------- GPS ---------- */
  let gps = null, trava = null;
  function ligaGps() {
    if (!("geolocation" in navigator)) { aviso("Este navegador não tem GPS. Dá pra marcar os bares pela lista.", true); return; }
    gps = navigator.geolocation.watchPosition((p) => {
      if (S.status !== "rodando" || demo) return;
      const { longitude: lon, latitude: lat, accuracy } = p.coords;
      if (accuracy > 60) return; // leitura ruim
      const ll = [lon, lat], ult = S.trilha[S.trilha.length - 1];
      if (ult) { const d = dist(ult, ll); if (d < 6) { posicaoEu(ll); return; } S.metros += d; }
      S.trilha.push([+lon.toFixed(6), +lat.toFixed(6)]);
      posicaoEu(ll); salva(); desenha();
    }, (e) => {
      aviso(e.code === 1 ? "O GPS foi bloqueado. Libere a localização para o site nas configurações do navegador; enquanto isso, marque os bares pela lista." : "Não deu para ler o GPS agora. Continue: os checkpoints funcionam pela lista.", true);
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }
  const desligaGps = () => { if (gps != null) navigator.geolocation.clearWatch(gps); gps = null; };
  async function acordado(on) {
    try { if (on && "wakeLock" in navigator && !trava) { trava = await navigator.wakeLock.request("screen"); trava.addEventListener("release", () => (trava = null)); } } catch {}
    if (!on && trava) { trava.release().catch(() => {}); trava = null; }
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.status === "rodando" && !demo) acordado(true); });

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
  $("bt-selfie").addEventListener("click", () => { $("arquivo").value = ""; $("arquivo").click(); });
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
    desenha();
  }

  /* ---------- controles ---------- */
  let tique = null;
  function roda() { clearInterval(tique); tique = setInterval(desenhaStats, 1000); }
  $("bt-play").addEventListener("click", () => {
    if (demo) paraDemo();
    if (S.status === "parado" || S.status === "pausado") {
      if (S.status === "parado") { S = { ...novo(), status: "rodando", desde: Date.now(), inicioEm: Date.now() }; aviso("Valendo! O trajeto aparece em laranja no mapa."); }
      else { S.status = "rodando"; S.desde = Date.now(); aviso("De volta à Baratona."); }
      ligaGps(); acordado(true); roda();
    } else if (S.status === "rodando") {
      S.acum += Date.now() - S.desde; S.status = "pausado"; desligaGps(); acordado(false); aviso("Pausado. O tempo parou.");
    }
    salva(); desenha();
  });
  $("bt-fim").addEventListener("click", () => {
    if (demo) { demo.fim = true; clearInterval(demo.tick); desenha(); return; }
    if (S.status === "rodando") S.acum += Date.now() - S.desde;
    S.status = "fim"; desligaGps(); acordado(false); clearInterval(tique); salva(); desenha();
    $("resumo").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("bt-zera").addEventListener("click", () => {
    if (demo) { paraDemo(); desenha(); return; }
    const bt = $("bt-zera");
    if (bt.dataset.certeza !== "1") { bt.dataset.certeza = "1"; bt.textContent = "Apagar atividade? Toque de novo"; setTimeout(() => { bt.dataset.certeza = ""; bt.textContent = "Recomeçar"; }, 4000); return; }
    bt.dataset.certeza = ""; bt.textContent = "Recomeçar";
    S = novo(); salva(); aviso("Aperte Iniciar quando estiver no Tantin."); desenha();
  });
  $("bt-kudos").addEventListener("click", () => { const a = demo || S; a.kudos = (a.kudos || 0) + 1; if (!demo) salva(); desenha(); });

  /* ---------- demonstração ---------- */
  const FOTOS = ["/arte/foto-beijo.webp", "/arte/foto-boia.webp", "/arte/foto-gatinho.webp", "/arte/ceci-boia.webp", "/arte/spritz.webp", "/arte/cerejas.webp", "/arte/onca.webp", "/arte/tarot.webp"];
  $("bt-demo").addEventListener("click", () => {
    if (S.status === "rodando") { aviso("Você está com uma atividade rodando. Pause ou finalize antes da demonstração.", true); return; }
    comecaDemo();
    $("mapa").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  function comecaDemo() {
    paraDemo();
    const linha = PERCURSO.linha && PERCURSO.linha.length ? PERCURSO.linha : BARS.map((b) => [b.lon, b.lat]);
    const acum = [0]; for (let i = 1; i < linha.length; i++) acum.push(acum[i - 1] + dist(linha[i - 1], linha[i]));
    const total = acum[acum.length - 1], DUR = 45000, JORNADA = (10 * 60 + 25) * 60000; // 13h → 23h25
    const ini = performance.now();
    const ordem = BARS.map((b) => { let m = 0, best = Infinity; linha.forEach((p, i) => { const d = dist(p, [b.lon, b.lat]); if (d < best) { best = d; m = acum[i]; } }); return { b, m }; });
    demo = { trilha: [], checks: [], relogio: 0, metros: 0, kudos: 0, fim: false };
    $("demo-selo").hidden = false;
    let k = 0, f = 0;
    demo.tick = setInterval(() => {
      const fr = Math.min(1, (performance.now() - ini) / DUR), alvo = fr * total;
      while (k < linha.length && acum[k] <= alvo) { demo.trilha.push(linha[k]); k++; }
      demo.metros = alvo; demo.relogio = fr * JORNADA;
      const ult = demo.trilha[demo.trilha.length - 1]; if (ult) posicaoEu(ult);
      ordem.forEach(({ b, m }) => { if (m <= alvo && !demo.checks.some((c) => c.id === b.id)) marca(b, FOTOS[f++ % FOTOS.length]); });
      if (fr >= 1) { demo.fim = true; clearInterval(demo.tick); aviso("Fim da demonstração. Lá embaixo está a atividade que sai no final."); }
      desenha();
    }, 120);
    aviso("Demonstração: 10 horas de Baratona em 45 segundos.");
    desenha();
  }
  function paraDemo() {
    if (!demo) return; clearInterval(demo.tick); demo = null; $("demo-selo").hidden = true;
    if (eu) { eu.remove(); eu = null; }
    const ult = S.trilha[S.trilha.length - 1]; if (ult) posicaoEu(ult);
    aviso(S.status === "parado" ? "Aperte Iniciar quando estiver no Tantin." : "");
  }

  /* ---------- tela ---------- */
  function desenhaStats() {
    const a = demo || S, n = a.checks.length, t = tempo(), m = demo ? demo.metros : S.metros;
    $("s-tempo").textContent = relogio(t); $("s-dist").textContent = km(m);
    $("s-bares").textContent = `${n}/${TOTAL}`; $("s-pace").textContent = pace(t, n);
  }
  function desenha() {
    const a = demo || S, st = demo ? (demo.fim ? "fim" : "rodando") : S.status;
    desenhaStats();
    $("estado").classList.toggle("on", st === "rodando");
    $("estado-txt").textContent = demo ? (demo.fim ? "Demo: fim" : "Demo") : { parado: "Parado", rodando: "Gravando", pausado: "Pausado", fim: "Finalizado" }[st];
    const play = $("bt-play");
    play.hidden = st === "fim" && !demo;
    play.textContent = demo ? "Iniciar" : st === "rodando" ? "Pausar" : st === "pausado" ? "Voltar" : "Iniciar";
    play.classList.toggle("pausa", !demo && st === "rodando");
    $("bt-fim").hidden = !(st === "rodando" || st === "pausado") || (demo && demo.fim);
    $("bt-demo").hidden = !!demo || S.status === "rodando";
    $("perto").hidden = !(st === "rodando" || st === "pausado") || !!demo;
    if (!$("perto").hidden) preencheBares();

    if (pronto) {
      mapa.getSource("trilha").setData(linhaGeo(a.trilha));
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
      $("r-sub").textContent = demo ? "28/11 · 13h · Pinheiros e Vila Madalena" : `${new Date(S.inicioEm || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${hhmm(t)} de Baratona`;
      $("r-tempo").textContent = relogio(t); $("r-dist").textContent = km(demo ? demo.metros : S.metros);
      $("r-bares").textContent = `${n}/${TOTAL}`; $("r-pace").textContent = pace(t, n);
      const g = $("r-grade"); g.textContent = "";
      a.checks.forEach((c) => { const im = document.createElement("img"); im.src = c.selfie; im.alt = `Selfie no ${c.nome}`; im.loading = "lazy"; g.append(im); });
      $("kudos-n").textContent = a.kudos ? `${a.kudos} ${a.kudos === 1 ? "saúde" : "saúdes"}` : "";
    }
  }

  /* ---------- imagem da atividade (1080x1920) ---------- */
  const carrega = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  async function imagem() {
    const a = demo || S, W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    await Promise.all(['italic 900 104px "Barlow"', '700 30px "DM Sans"', '30px "Permanent Marker"'].map((f) => document.fonts.load(f))).catch(() => {});
    g.fillStyle = "#F5E9D4"; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(42,29,34,.06)"; for (let y = 0; y < H; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < W; x += 14) g.fillRect(x, y, 2, 2);
    const logo = await carrega("/arte/logo-vermelho.webp");
    if (logo) g.drawImage(logo, 60, 60, 300, 300 * logo.height / logo.width);
    const ico = await carrega("/straga-icone.svg");
    if (ico) g.drawImage(ico, 610, 80, 120, 120);
    g.save(); g.translate(1010, 150); g.rotate(-0.07); g.textAlign = "right";
    g.font = 'italic 900 104px "Barlow", "Arial Black", sans-serif'; g.fillStyle = "#FC4C02"; g.fillText("STRAGA", 0, 40);
    g.font = '34px "Permanent Marker", cursive'; g.fillStyle = "#2A1D22"; g.fillText("o Strava da Baratona", -6, 100); g.restore();
    // stats
    const t = tempo(), n = a.checks.length, m = demo ? demo.metros : S.metros;
    const st = [["TEMPO", relogio(t)], ["DISTÂNCIA", km(m)], ["BARES", `${n}/${TOTAL}`], ["PACE FOFOCA", pace(t, n)]];
    g.fillStyle = "#2A1D22"; rr(g, 66, 406, 948, 170, 26); g.fill();
    g.fillStyle = "#FCF6EA"; rr(g, 60, 400, 948, 170, 26); g.fill(); g.lineWidth = 4; g.strokeStyle = "#2A1D22"; g.stroke();
    st.forEach(([k, v], i) => {
      const x = 60 + 948 / 8 + (i * 948) / 4; g.textAlign = "center";
      g.font = '700 22px "DM Sans", sans-serif'; g.fillStyle = "#6A5258"; g.fillText(k, x, 460);
      g.font = '700 46px "DM Sans", sans-serif'; g.fillStyle = i === 0 ? "#D3213C" : "#2A1D22"; g.fillText(v, x, 524);
    });
    // trajeto (projeção própria sobre o papel)
    const box = { x: 60, y: 620, w: 960, h: 640 };
    g.fillStyle = "#FCF6EA"; rr(g, box.x, box.y, box.w, box.h, 26); g.fill(); g.lineWidth = 4; g.strokeStyle = "#2A1D22"; g.stroke();
    const tr = a.trilha.length > 1 ? a.trilha : (PERCURSO.linha || []);
    const pts = [...tr, ...BARS.map((b) => [b.lon, b.lat])];
    const merc = ([lo, la]) => [lo, -Math.log(Math.tan(Math.PI / 4 + rad(la) / 2)) * 180 / Math.PI];
    const ms = pts.map(merc), xs = ms.map((p) => p[0]), ys = ms.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 50;
    const k = Math.min((box.w - pad * 2) / (x1 - x0 || 1), (box.h - pad * 2) / (y1 - y0 || 1));
    const ox = box.x + (box.w - (x1 - x0) * k) / 2, oy = box.y + (box.h - (y1 - y0) * k) / 2;
    const P = (ll) => { const [x, y] = merc(ll); return [ox + (x - x0) * k, oy + (y - y0) * k]; };
    g.lineCap = "round"; g.lineJoin = "round";
    if (a.trilha.length > 1) {
      g.beginPath(); a.trilha.map(P).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.strokeStyle = "#2A1D22"; g.lineWidth = 14; g.stroke(); g.strokeStyle = "#FC4C02"; g.lineWidth = 8; g.stroke();
    }
    const feitos = new Set(a.checks.map((c) => c.id));
    BARS.forEach((b) => { const [x, y] = P([b.lon, b.lat]); g.beginPath(); g.arc(x, y, feitos.has(b.id) ? 11 : 7, 0, Math.PI * 2); g.fillStyle = feitos.has(b.id) ? "#D3213C" : "#C9B9A3"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#FCF6EA"; g.stroke(); });
    // selfies
    const fotos = await Promise.all(a.checks.slice(0, 15).map((c) => carrega(c.selfie)));
    const cols = 5, lado = 150, gap = 26, gx = (W - (cols * lado + (cols - 1) * gap)) / 2;
    fotos.forEach((im, i) => {
      const x = gx + (i % cols) * (lado + gap), y = 1310 + Math.floor(i / cols) * (lado + gap);
      g.save(); g.translate(x + lado / 2, y + lado / 2); g.rotate(((i * 37) % 7 - 3) * 0.012);
      g.fillStyle = "#FCF6EA"; g.fillRect(-lado / 2 - 8, -lado / 2 - 8, lado + 16, lado + 16);
      if (im) { const s = Math.min(im.width, im.height); g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, -lado / 2, -lado / 2, lado, lado); }
      g.restore();
    });
    if (a.checks.length > 15) { g.textAlign = "center"; g.font = '700 28px "DM Sans", sans-serif'; g.fillStyle = "#6A5258"; g.fillText(`+ ${a.checks.length - 15} bares`, W / 2, 1890); }
    g.textAlign = "center"; g.font = '700 30px "DM Sans", sans-serif'; g.fillStyle = "#2A1D22";
    if (a.checks.length <= 15) g.fillText("28/11 · Baratona da Ceci · Pinheiros", W / 2, 1880);
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
      const a = document.createElement("a"); a.className = "bt pink"; a.href = url; a.download = nome; a.textContent = "⬇ Baixar imagem"; linha.append(a);
      if (navigator.canShare && navigator.canShare({ files: [arq] })) { const s = document.createElement("button"); s.className = "bt"; s.type = "button"; s.textContent = "Compartilhar"; s.onclick = () => navigator.share({ files: [arq] }).catch(() => {}); linha.append(s); }
      const p = document.createElement("p"); p.textContent = "No celular, dá pra segurar a imagem para salvar nas fotos.";
      const f = document.createElement("button"); f.className = "fecha"; f.type = "button"; f.textContent = "Fechar";
      const sai = () => { v.remove(); URL.revokeObjectURL(url); bt.focus(); };
      f.onclick = sai; v.onclick = (e) => { if (e.target === v) sai(); };
      v.append(im, linha, p, f); document.body.append(v); a.focus();
    } catch { aviso("Não deu para gerar a imagem.", true); }
    bt.disabled = false; bt.textContent = r;
  });

  /* ---------- início ---------- */
  iniciaMapa();
  if (S.status === "rodando") { ligaGps(); acordado(true); roda(); aviso("Atividade em andamento. O cronômetro não parou."); }
  else if (S.status === "pausado") aviso("Atividade pausada. Aperte Voltar para continuar.");
  desenha();
  setTimeout(() => { const ult = S.trilha[S.trilha.length - 1]; if (ult) posicaoEu(ult); }, 1500);
})();
