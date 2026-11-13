/* Sessão por telefone e chamadas à API, usados pela página principal e pelo check-in. */
// Votar não pede telefone: cada navegador ganha uma identificação anônima (32 hex) na primeira
// vez que vota ou sugere. O login por celular ficou só para os admins (/?admin) e o check-in.
let tokenMemoria = "";
const Sessao = {
  get token() { try { return localStorage.getItem("baratona-token") || tokenMemoria; } catch { return tokenMemoria; } },
  get nome() { try { return localStorage.getItem("baratona-nome") || ""; } catch { return ""; } },
  get anonimo() { try { return localStorage.getItem("baratona-anon") === "1"; } catch { return !!tokenMemoria; } },
  get telefone() { return !!this.token && !this.anonimo; },
  garante() {
    if (this.token) return this.token;
    const a = new Uint8Array(16); crypto.getRandomValues(a);
    const t = [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
    try { localStorage.setItem("baratona-token", t); localStorage.setItem("baratona-nome", ""); localStorage.setItem("baratona-anon", "1"); }
    catch { tokenMemoria = t; }
    return t;
  },
  salva(token, nome) { try { localStorage.setItem("baratona-token", token); localStorage.setItem("baratona-nome", nome || ""); localStorage.removeItem("baratona-anon"); } catch {} },
  nomeAtual(nome) { try { localStorage.setItem("baratona-nome", nome || ""); } catch {} },
  sai() { tokenMemoria = ""; try { localStorage.removeItem("baratona-token"); localStorage.removeItem("baratona-nome"); localStorage.removeItem("baratona-anon"); } catch {} },
};

async function api(path, body) {
  const opts = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Sessao.token, ...body }) }
    : { cache: "no-store" };
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && !Sessao.anonimo) { Sessao.sai(); }
  if (!r.ok) { const e = new Error(j.erro || "Algo deu errado. Tente de novo."); e.status = r.status; throw e; }
  return j;
}

const formataTel = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? "(" + d : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/* Liga o login da página e avisa quando muda. A home não tem mais o cartão de login (quem
   vota entra pela janelinha) e mostra só a linha #sessao ("Oi, Fulano! · sair"); o check-in
   ainda usa o cartão (#login, #logado, #form-login, #form-nome). */
function montaLogin(aoMudar) {
  const $ = (id) => document.getElementById(id);
  const tel = $("tel"), msg = $("msg-login"), nomeIn = $("nome-perfil"), sessao = $("sessao");
  const sai = () => { Sessao.sai(); desenha(); aoMudar && aoMudar(); };
  function desenha() {
    const dentro = Sessao.telefone, n = Sessao.nome;
    if (sessao) {
      sessao.hidden = !dentro; sessao.textContent = "";
      if (dentro) {
        const b = document.createElement("b"); b.textContent = n ? n.split(" ")[0] : "você";
        const bt = document.createElement("button"); bt.type = "button"; bt.textContent = "sair"; bt.onclick = sai;
        sessao.append("Oi, ", b, "! 💋 · ", bt);
      }
    }
    if (!tel) return;
    $("login").hidden = dentro; $("logado").hidden = !dentro;
    if (dentro) {
      $("oi").textContent = n ? `Oi, ${n.split(" ")[0]}! 💋` : "Oi! Como a galera te chama?";
      $("rot-nome").textContent = n ? "Seu nome (pode editar)" : "Escreva seu nome para continuar";
      nomeIn.value = n;
    }
  }
  // A janelinha de login (JanelaLogin) avisa a página por aqui: redesenha e recarrega os dados.
  window.aoEntrar = async () => { desenha(); if (aoMudar) await aoMudar(); };
  desenha();
  if (!tel) return { desenha };
  tel.addEventListener("input", () => { tel.value = formataTel(tel.value); });
  $("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = $("bt-entrar"); b.disabled = true; msg.textContent = "";
    try {
      const j = await api("/api/entrar", { telefone: tel.value });
      Sessao.salva(j.token, j.nome);
      desenha(); aoMudar && aoMudar();
      if (!j.nome) nomeIn.focus();
    } catch (err) { msg.textContent = err.message; }
    b.disabled = false;
  });
  $("form-nome").addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = $("bt-nome"); b.disabled = true; msg.textContent = "";
    try {
      const j = await api("/api/perfil", { nome: nomeIn.value });
      Sessao.nomeAtual(j.nome); desenha(); msg.textContent = "Nome salvo."; aoMudar && aoMudar();
    } catch (err) { msg.textContent = err.message; if (err.status === 401) desenha(); }
    b.disabled = false;
  });
  $("sair").addEventListener("click", () => { sai(); tel.focus(); });
  return { desenha };
}

/* Exige login com nome. Se faltar, abre uma janelinha ali mesmo (sem pular a página até o
   cartão de login) e, depois de entrar, faz o que a pessoa tinha tentado (depois). */
function precisaLogin(acao, depois) {
  if (Sessao.telefone && Sessao.nome) return true;
  JanelaLogin.abre(acao, depois);
  return false;
}

const JanelaLogin = (() => {
  let dlg = null, pendente = null;
  const css = `
.dlg-login{border:2px solid var(--tinta);border-radius:16px;padding:0;background:var(--papel-2);color:var(--tinta);width:min(92vw,400px);box-shadow:6px 6px 0 var(--pink)}
.dlg-login::backdrop{background:rgba(42,29,34,.45)}
.dlg-login form{padding:22px 18px 18px;display:flex;flex-direction:column;gap:10px;position:relative}
.dlg-login h2{font-family:var(--f-marker);color:var(--vermelho);font-size:30px;line-height:1;margin:0 34px 0 0;transform:rotate(-1.5deg);font-weight:400}
.dlg-login .dlg-msg{font-size:15px;margin:0}
.dlg-login label{font-family:var(--f-maquina);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta-2)}
.dlg-login .dlg-linha{display:flex;gap:8px}
.dlg-login input{flex:1;min-width:0;font:18px var(--f-body);color:var(--tinta);background:var(--papel);border:2px solid var(--tinta);border-radius:10px;padding:11px 12px}
.dlg-login button[type=submit]{font:700 16px var(--f-body);background:var(--vermelho);color:var(--papel-2);border:2px solid var(--tinta);border-radius:10px;padding:10px 16px;cursor:pointer;flex:none}
.dlg-login button[type=submit]:disabled{opacity:.5;cursor:default}
.dlg-login .dlg-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border:0;background:none;font:400 26px/1 var(--f-body);color:var(--tinta-2);cursor:pointer;border-radius:8px}
.dlg-login .dlg-erro{font-size:14px;color:var(--vermelho);margin:0;min-height:1.2em}
.dlg-login input:focus-visible,.dlg-login button:focus-visible{outline:3px solid var(--pink);outline-offset:2px}`;
  function monta() {
    if (dlg) return dlg;
    const st = document.createElement("style"); st.textContent = css; document.head.append(st);
    dlg = document.createElement("dialog"); dlg.className = "dlg-login"; dlg.setAttribute("aria-labelledby", "dlg-titulo");
    dlg.innerHTML = `<form novalidate>
      <button type="button" class="dlg-x" aria-label="Fechar">×</button>
      <h2 id="dlg-titulo">Entre com seu telefone</h2>
      <p class="dlg-msg" id="dlg-msg"></p>
      <div id="dlg-passo-tel"><label for="dlg-tel">Seu celular com DDD</label>
        <div class="dlg-linha"><input id="dlg-tel" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(11) 99999-9999" maxlength="20"><button type="submit">Entrar</button></div></div>
      <div id="dlg-passo-nome" hidden><label for="dlg-nome">Seu nome</label>
        <div class="dlg-linha"><input id="dlg-nome" type="text" maxlength="40" autocomplete="name" placeholder="Como a galera te chama"><button type="submit">Salvar</button></div></div>
      <p class="dlg-erro" id="dlg-erro" aria-live="polite"></p></form>`;
    document.body.append(dlg);
    const q = (id) => dlg.querySelector("#" + id), tel = q("dlg-tel"), nome = q("dlg-nome"), erro = q("dlg-erro");
    tel.addEventListener("input", () => { tel.value = formataTel(tel.value); });
    dlg.querySelector(".dlg-x").onclick = () => dlg.close();
    dlg.addEventListener("close", () => { pendente = null; });
    dlg.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const bt = e.submitter || dlg.querySelector("button[type=submit]"); bt.disabled = true; erro.textContent = "";
      try {
        if (!Sessao.telefone) {
          const j = await api("/api/entrar", { telefone: tel.value });
          Sessao.salva(j.token, j.nome);
        } else {
          const j = await api("/api/perfil", { nome: nome.value });
          Sessao.nomeAtual(j.nome);
        }
        if (!Sessao.nome) { mostraPasso(); nome.focus(); }
        else {
          const fazer = pendente; pendente = null; dlg.close();
          if (typeof window.aoEntrar === "function") await window.aoEntrar();
          if (fazer) fazer();
        }
      } catch (err) { erro.textContent = err.message; if (err.status === 401) mostraPasso(); }
      bt.disabled = false;
    });
    return dlg;
  }
  function mostraPasso() {
    const comToken = Sessao.telefone;
    dlg.querySelector("#dlg-passo-tel").hidden = comToken; dlg.querySelector("#dlg-passo-nome").hidden = !comToken;
    dlg.querySelector("#dlg-titulo").textContent = comToken ? "Como a galera te chama?" : "Entre com seu telefone";
  }
  return {
    abre(acao, depois) {
      monta(); pendente = depois || null;
      dlg.querySelector("#dlg-erro").textContent = "";
      dlg.querySelector("#dlg-msg").textContent = Sessao.telefone ? `Escreva seu nome para ${acao}.` : `Pra ${acao}, entre com o celular que está na lista da Ceci.`;
      mostraPasso();
      if (!dlg.open) dlg.showModal();
      dlg.querySelector(Sessao.telefone ? "#dlg-nome" : "#dlg-tel").focus();
    },
  };
})();
