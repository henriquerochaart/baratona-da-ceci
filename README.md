# Baratona da Ceci

Site da Baratona da Ceci (28/11, 13h, encontro no Tantin, R. dos Pinheiros, 987). A votação dos bares fechou em 18/11; a home agora mostra o percurso escolhido (26 bares, ordem pelo horário de abertura no sábado). Em `/straga` fica o Straga, o "Strava da Baratona".

- `public/` — página (HTML, JS, imagens)
- `api/` — funções da Vercel. Votos, sugestões, perfis, check-ins e a turma do Straga ficam numa tabela do Postgres (Neon, variável `DATABASE_URL`), em `api/_store.js`. O Vercel Blob ficou conectado, mas não é mais usado para votos.

## Como editar

- Todo push na `main` publica sozinho em https://baratona-da-ceci.vercel.app (projeto `baratona-da-ceci` na Vercel). Branch diferente de `main` gera só prévia.
- Texto, data, local e visual do convite: `public/index.html` e `public/comum.js`. Pré-lista de bares: `public/bares.js`. Imagens: `public/arte/`.
- Lista de convidados (`CONVIDADOS`), segredo do login (`SEGREDO`), admins (`ADMINS`) e token do Blob ficam nas variáveis de ambiente da Vercel, nunca no repositório. Não commitar nome nem telefone de convidado.

## Quem vota

Qualquer pessoa vota e sugere bar sem telefone: o navegador ganha uma identificação anônima na primeira vez (localStorage `baratona-token` + `baratona-anon`). Dá para votar de novo trocando de navegador; é o preço de não pedir telefone.

## Admin

Entrar como admin: abra `/?admin` e entre com o celular. Quem entra com um celular listado em `ADMINS` (separados por vírgula, com ou sem DDD 55, com ou sem máscara) vê "apagar" em cada bar da lista e um painel "Admin · bares apagados" com "restaurar". Apagar só esconde o bar da lista, do mapa, da busca e do check-in; os votos ficam guardados e voltam ao restaurar. O celular de admin também precisa estar em `CONVIDADOS`. Mudou `ADMINS`? Faça um redeploy para valer.

## Percurso

- `public/percurso.js` liga o "modo percurso" da home: paradas em ordem, distância a pé entre elas, hora prevista e o traçado no mapa. Sem esse arquivo a home volta a ser a votação.
- O arquivo é gerado fora do site (votos finais + horário de sábado no Google Maps + rotas a pé do OSRM). Para mudar a ordem, edite as paradas e o traçado ali.
- `public/mapa-imagem.js`: botão "Baixar mapa em imagem" (story 1080×1920).

## Straga (`/straga`)

- Arquivos: `public/straga.html`, `public/straga.js`, `public/straga-icone.svg`, `public/straga-marca*.svg`, `public/conquistas/*.svg` (14 conquistas). A rota `/straga` vem do `vercel.json`.
- Iniciar grava de verdade; "Ver demonstração" roda o percurso acelerado. Iniciar e a demonstração abrem em tela cheia, com seta para voltar.
- Tela de gravação: tempo, drinks (− e +), quilômetros; o alfinete troca para o mapa de satélite (Esri World Imagery, crédito embaixo do mapa, obrigatório).
- Tudo da atividade fica no celular (localStorage `straga-atividade`). Com o celular bloqueado o navegador não lê GPS; ao voltar, o Straga completa o trecho pelas ruas (rota a pé do OSRM).
- Turma: `api/straga.js`. Guarda nome, bares, drinks, km, conquistas e, só enquanto a pessoa grava e deixa marcado, a posição (~10 m). A posição some 30 min depois; linhas com mais de 3 dias são apagadas. Ranking: bares > conquistas > km (drinks não pontuam).
- Capa do link: `public/arte/straga-capa-laranja.png`. Para o WhatsApp gerar prévia nova, mande o link com `?v=N`.
