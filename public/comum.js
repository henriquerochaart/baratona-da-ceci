/* Sessão por telefone e chamadas à API, usados pela página principal e pelo check-in. */
const Sessao = {
  get token() { try { return localStorage.getItem("baratona-token") || ""; } catch { return ""; } },
  get nome() { try { return localStorage.getItem("baratona-nome") || ""; } catch { return ""; } },
  salva(token, nome) { try { localStorage.setItem("baratona-token", token); localStorage.setItem("baratona-nome", nome || ""); } catch {} },
  nomeAtual(nome) { try { localStorage.setItem("baratona-nome", nome || ""); } catch {} },
  sai() { try { localStorage.removeItem("baratona-token"); localStorage.removeItem("baratona-nome"); } catch {} },
};

async function api(path, body) {
  const opts = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Sessao.token, ...body }) }
    : { cache: "no-store" };
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { Sessao.sai(); }
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

/* Liga o cartão de login (#login, #logado, #form-login, #form-nome) e avisa quando muda. */
function montaLogin(aoMudar) {
  const $ = (id) => document.getElementById(id);
  const tel = $("tel"), msg = $("msg-login"), nomeIn = $("nome-perfil");
  if (!tel) return;
  tel.addEventListener("input", () => { tel.value = formataTel(tel.value); });
  function desenha() {
    const dentro = !!Sessao.token;
    $("login").hidden = dentro; $("logado").hidden = !dentro;
    if (dentro) {
      const n = Sessao.nome;
      $("oi").textContent = n ? `Oi, ${n.split(" ")[0]}! 💋` : "Oi! Como a galera te chama?";
      $("rot-nome").textContent = n ? "Seu nome (pode editar)" : "Escreva seu nome para continuar";
      nomeIn.value = n;
    }
  }
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
  $("sair").addEventListener("click", () => { Sessao.sai(); desenha(); aoMudar && aoMudar(); tel.focus(); });
  desenha();
  return { desenha };
}

/* Exige login com nome; leva a pessoa ao cartão de login se faltar. */
function precisaLogin(acao) {
  if (Sessao.token && Sessao.nome) return true;
  const card = document.getElementById("entrar");
  const msg = document.getElementById("msg-login");
  if (msg) msg.textContent = Sessao.token ? "Escreva seu nome para " + acao + "." : "Entre com seu telefone para " + acao + ".";
  if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  const alvo = document.getElementById(Sessao.token ? "nome-perfil" : "tel");
  if (alvo) setTimeout(() => alvo.focus(), 400);
  return false;
}
