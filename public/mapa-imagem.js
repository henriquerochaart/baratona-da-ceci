/* Botão "Baixar mapa": monta uma imagem 1080x1920 (story) com o mapa do percurso centralizado,
   degradê no topo para o logo e a lista das 26 paradas com horário embaixo.
   O mapa vem do OpenFreeMap (CORS liberado). Se não carregar, desenha o percurso sobre o papel. */
(function () {
  const bt = document.getElementById("bt-baixar");
  if (!bt) return;
  if (typeof PERCURSO === "undefined" || typeof paradas !== "function") { bt.hidden = true; return; }

  const W = 1080, H = 1920;
  const COR = { papel: "#F5E9D4", papel2: "#FCF6EA", pink: "#E43F86", vermelho: "#D3213C", tinta: "#2A1D22", tinta2: "#6A5258", rosa: "#F49AC2" };
  // Área do mapa onde o percurso fica (px da imagem): abaixo do logo, acima da lista.
  const AREA = { top: 450, bottom: 1370, left: 80, right: 1000 };
  const LISTA_Y = 1490;

  const img = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
  const coord = (p) => [p.bar.lon ?? p.bar.lng, p.bar.lat];

  /* ---------- mapa de fundo (MapLibre fora da tela) ---------- */
  function mapaDeFundo(pontos) {
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
          const c = m.getCanvas();
          const out = document.createElement("canvas"); out.width = W; out.height = H;
          out.getContext("2d").drawImage(c, 0, 0, W, H);
          out.toDataURL("image/png").slice(0, 32); // dispara erro se o canvas ficou "sujo" (CORS)
          return { canvas: out, projeta: (ll) => { const q = m.project(ll); return [q.x * 2, q.y * 2]; } };
        } catch { return null; }
      }
      try {
        m = new maplibregl.Map({
          container: box, style: "https://tiles.openfreemap.org/styles/liberty",
          pixelRatio: 2, interactive: false, attributionControl: false,
          preserveDrawingBuffer: true, fadeDuration: 0,
        });
      } catch { return fim(null); }
      m.on("error", () => {});
      m.once("load", () => {
        const b = new maplibregl.LngLatBounds();
        pontos.forEach((ll) => b.extend(ll));
        m.fitBounds(b, { padding: { top: AREA.top / 2, bottom: (H - AREA.bottom) / 2, left: AREA.left / 2, right: (W - AREA.right) / 2 }, duration: 0 });
        m.once("idle", () => fim(captura()));
      });
    });
  }

  /* ---------- plano B: projeção própria sobre o papel ---------- */
  function fundoPapel(pontos) {
    const out = document.createElement("canvas"); out.width = W; out.height = H;
    const g = out.getContext("2d");
    g.fillStyle = COR.papel; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(42,29,34,.07)"; g.lineWidth = 2;
    for (let x = 0; x <= W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const merc = ([lon, lat]) => [lon, -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180 / Math.PI];
    const ms = pontos.map(merc);
    const xs = ms.map((p) => p[0]), ys = ms.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const aw = AREA.right - AREA.left, ah = AREA.bottom - AREA.top;
    const k = Math.min(aw / (x1 - x0), ah / (y1 - y0));
    const ox = AREA.left + (aw - (x1 - x0) * k) / 2, oy = AREA.top + (ah - (y1 - y0) * k) / 2;
    return { canvas: out, projeta: (ll) => { const [x, y] = merc(ll); return [ox + (x - x0) * k, oy + (y - y0) * k]; }, papel: true };
  }

  /* ---------- pinos sem sobreposição ---------- */
  function afasta(pos, r) {
    const p = pos.map(([x, y]) => ({ x, y, ox: x, oy: y }));
    const min = r * 2 + 4;
    for (let it = 0; it < 120; it++) {
      for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
        const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y, d = Math.hypot(dx, dy) || 0.01;
        if (d < min) { const e = (min - d) / 2, ux = dx / d || 1, uy = dy / d; p[i].x -= ux * e; p[i].y -= uy * e; p[j].x += ux * e; p[j].y += uy * e; }
      }
      p.forEach((q) => { q.x += (q.ox - q.x) * 0.02; q.y += (q.oy - q.y) * 0.02; });
    }
    return p;
  }

  function ajusta(g, txt, max) {
    if (g.measureText(txt).width <= max) return txt;
    while (txt.length > 1 && g.measureText(txt + "…").width > max) txt = txt.slice(0, -1);
    return txt.trimEnd() + "…";
  }

  async function gera() {
    const lista = paradas();
    const pontos = lista.map(coord);
    await Promise.all([
      document.fonts.load('64px "Shrikhand"'), document.fonts.load('700 26px "DM Sans"'),
      document.fonts.load('500 26px "DM Sans"'), document.fonts.load('30px "Permanent Marker"'),
    ]).catch(() => {});
    const [logo, estrela, cerejas, coracao, dourada] = await Promise.all(
      ["logo", "estrela-rosa", "cerejas", "coracao-rosa", "estrela-dourada"].map((n) => img(`/arte/${n}.webp`).catch(() => null)));

    const fundo = (await mapaDeFundo(pontos)) || fundoPapel(pontos);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.drawImage(fundo.canvas, 0, 0);
    if (!fundo.papel) { g.fillStyle = "rgba(245,233,212,.18)"; g.fillRect(0, 0, W, H); } // aquece o mapa no tom do site

    // percurso
    const linha = (PERCURSO.linha && PERCURSO.linha.length ? PERCURSO.linha : pontos).map(fundo.projeta);
    g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); linha.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = COR.papel2; g.lineWidth = 16; g.stroke();
    g.setLineDash([20, 14]); g.strokeStyle = COR.vermelho; g.lineWidth = 8; g.stroke(); g.setLineDash([]);

    // pinos numerados
    const R = 21;
    const pos = afasta(pontos.map(fundo.projeta), R);
    const a = lista[0], z = lista[lista.length - 1];
    pos.forEach((q, i) => {
      if (Math.hypot(q.x - q.ox, q.y - q.oy) > 4) {
        g.beginPath(); g.moveTo(q.ox, q.oy); g.lineTo(q.x, q.y); g.strokeStyle = COR.tinta; g.lineWidth = 2; g.stroke();
        g.beginPath(); g.arc(q.ox, q.oy, 4, 0, Math.PI * 2); g.fillStyle = COR.tinta; g.fill();
      }
    });
    // etiqueta do começo e do fim
    const etiqueta = (q, txt, lado) => {
      g.font = '700 24px "DM Sans", system-ui, sans-serif';
      const w = g.measureText(txt).width + 28, h = 44;
      let x = q.x - w / 2, y = lado > 0 ? q.y + R + 10 : q.y - R - 10 - h;
      x = Math.max(16, Math.min(W - 16 - w, x));
      g.fillStyle = COR.tinta; roundRect(g, x + 3, y + 3, w, h, 22); g.fill();
      g.fillStyle = COR.papel2; roundRect(g, x, y, w, h, 22); g.fill();
      g.lineWidth = 3; g.strokeStyle = COR.tinta; g.stroke();
      g.fillStyle = COR.tinta; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(txt, x + 14, y + h / 2 + 1);
    };
        etiqueta(pos[0], `${a.bar.nome} · ${a.hora}`, 1);
    etiqueta(pos[pos.length - 1], `${z.bar.nome} · ${z.hora}`, -1);

    pos.forEach((q, i) => {
      const ponta = i === 0 || i === pos.length - 1;
      g.beginPath(); g.arc(q.x + 3, q.y + 3, R, 0, Math.PI * 2); g.fillStyle = "rgba(42,29,34,.85)"; g.fill();
      g.beginPath(); g.arc(q.x, q.y, R, 0, Math.PI * 2); g.fillStyle = ponta ? COR.pink : COR.vermelho; g.fill();
      g.lineWidth = 4; g.strokeStyle = COR.papel2; g.stroke();
      g.fillStyle = COR.papel2; g.font = '700 21px "DM Sans", system-ui, sans-serif';
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(lista[i].n), q.x, q.y + 1);
    });
    // degradê do topo + logo
    let gr = g.createLinearGradient(0, 0, 0, 470);
    gr.addColorStop(0, "rgba(245,233,212,.97)"); gr.addColorStop(0.55, "rgba(245,233,212,.82)"); gr.addColorStop(1, "rgba(245,233,212,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, 470);
    if (logo) { const lw = 470, lh = (logo.height / logo.width) * lw; g.drawImage(logo, (W - lw) / 2, 34, lw, lh); }
    if (estrela) g.drawImage(estrela, 92, 150, 78, 95);
    if (cerejas) { g.save(); g.translate(930, 190); g.rotate(0.18); g.drawImage(cerejas, -55, -66, 110, 131); g.restore(); }
    if (dourada) g.drawImage(dourada, 190, 330, 46, 48);
    if (coracao) g.drawImage(coracao, 850, 345, 44, 58);

    // degradê de baixo + lista
    gr = g.createLinearGradient(0, LISTA_Y - 110, 0, LISTA_Y - 10);
    gr.addColorStop(0, "rgba(245,233,212,0)"); gr.addColorStop(1, "rgba(245,233,212,1)");
    g.fillStyle = gr; g.fillRect(0, LISTA_Y - 110, W, 100);
    g.fillStyle = COR.papel; g.fillRect(0, LISTA_Y - 10, W, H - LISTA_Y + 10);
    if (!fundo.papel) {
      g.font = '500 15px "DM Sans", system-ui, sans-serif'; g.fillStyle = COR.tinta2; g.textAlign = "right"; g.textBaseline = "alphabetic";
      g.fillText("© OpenStreetMap · OpenFreeMap", W - 24, LISTA_Y - 16);
    }
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.font = '40px "Shrikhand", Georgia, serif'; g.fillStyle = COR.vermelho;
    g.fillText("28/11 · 13h", W / 2, LISTA_Y + 34);
    g.font = '700 23px "DM Sans", system-ui, sans-serif'; g.fillStyle = COR.tinta;
    g.fillText(`Encontro no ${a.bar.nome} · ${a.bar.end || "R. dos Pinheiros, 987"}`, W / 2, LISTA_Y + 70);

    const cols = 3, porCol = Math.ceil(lista.length / cols), cw = (W - 64) / cols, y0 = LISTA_Y + 116, lh = 33;
    g.textAlign = "left";
    lista.forEach((p, i) => {
      const col = Math.floor(i / porCol), row = i % porCol, x = 32 + col * cw, y = y0 + row * lh;
      g.font = '700 20px "DM Sans", system-ui, sans-serif'; g.fillStyle = COR.vermelho;
      g.fillText(String(p.n).padStart(2, "0"), x, y);
      g.fillStyle = COR.pink; g.fillText(p.hora, x + 34, y);
      g.font = '500 20px "DM Sans", system-ui, sans-serif'; g.fillStyle = COR.tinta;
      g.fillText(ajusta(g, p.bar.nome, cw - 112), x + 104, y);
    });

    return new Promise((ok, erro) => c.toBlob((b) => (b ? ok(b) : erro(new Error("Não deu para gerar a imagem."))), "image/png"));
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  /* ---------- prévia com botões de salvar ---------- */
  let url = null;
  function mostra(blob) {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    const nome = "baratona-da-ceci-mapa.png";
    const arq = new File([blob], nome, { type: "image/png" });
    const vel = document.createElement("div"); vel.className = "previa"; vel.setAttribute("role", "dialog"); vel.setAttribute("aria-label", "Imagem do mapa");
    const fig = document.createElement("img"); fig.src = url; fig.alt = "Mapa do percurso da Baratona da Ceci";
    const acoes = document.createElement("div"); acoes.className = "previa-acoes";
    const baixar = document.createElement("a"); baixar.href = url; baixar.download = nome; baixar.className = "bt-salvar"; baixar.textContent = "⬇ Baixar imagem";
    acoes.append(baixar);
    if (navigator.canShare && navigator.canShare({ files: [arq] })) {
      const comp = document.createElement("button"); comp.type = "button"; comp.className = "bt-salvar"; comp.textContent = "Compartilhar";
      comp.onclick = () => navigator.share({ files: [arq] }).catch(() => {});
      acoes.append(comp);
    }
    const dica = document.createElement("p"); dica.textContent = "No celular, dá pra segurar a imagem para salvar nas fotos.";
    const fecha = document.createElement("button"); fecha.type = "button"; fecha.className = "previa-fecha"; fecha.textContent = "Fechar";
    const sai = () => { vel.remove(); document.removeEventListener("keydown", esc); bt.focus(); };
    const esc = (e) => { if (e.key === "Escape") sai(); };
    fecha.onclick = sai; vel.onclick = (e) => { if (e.target === vel) sai(); };
    document.addEventListener("keydown", esc);
    vel.append(fig, acoes, dica, fecha);
    document.body.append(vel);
    baixar.focus();
  }

  const rotulo = bt.textContent;
  bt.addEventListener("click", async () => {
    if (bt.disabled) return;
    bt.disabled = true; bt.textContent = "Gerando imagem…";
    try { mostra(await gera()); }
    catch (e) { if (typeof aviso === "function") aviso(e.message || "Não deu para gerar a imagem."); }
    bt.disabled = false; bt.textContent = rotulo;
  });
})();
