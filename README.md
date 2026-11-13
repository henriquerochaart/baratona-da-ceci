# Baratona da Ceci

Site da Baratona da Ceci (28/11, 13h, Rua dos Pinheiros, 1057): pré-lista de bares no mapa, busca e sugestão de bares e votação com setas.

- `public/` — página (HTML, JS, imagens)
- `api/` — funções da Vercel; votos, sugestões e presenças ficam no Vercel Blob (variável `BLOB_READ_WRITE_TOKEN`)

## Como editar

- Todo push na `main` publica sozinho em https://baratona-da-ceci.vercel.app (projeto `baratona-da-ceci` na Vercel). Branch diferente de `main` gera só prévia.
- Texto, data, local e visual do convite: `public/index.html` e `public/comum.js`. Pré-lista de bares: `public/bares.js`. Imagens: `public/arte/`.
- Lista de convidados (`CONVIDADOS`), segredo do login (`SEGREDO`), admins (`ADMINS`) e token do Blob ficam nas variáveis de ambiente da Vercel, nunca no repositório. Não commitar nome nem telefone de convidado.

## Quem vota

Qualquer pessoa vota e sugere bar sem telefone: o navegador ganha uma identificação anônima na primeira vez (localStorage `baratona-token` + `baratona-anon`). Dá para votar de novo trocando de navegador; é o preço de não pedir telefone.

## Admin

Entrar como admin: abra `/?admin` e entre com o celular. Quem entra com um celular listado em `ADMINS` (separados por vírgula, com ou sem DDD 55, com ou sem máscara) vê "apagar" em cada bar da lista e um painel "Admin · bares apagados" com "restaurar". Apagar só esconde o bar da lista, do mapa, da busca e do check-in; os votos ficam guardados e voltam ao restaurar. O celular de admin também precisa estar em `CONVIDADOS`. Mudou `ADMINS`? Faça um redeploy para valer.
