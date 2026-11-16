# Gestão de Lojas

Plataforma de vitrines online (multilojas) com painel da lojista e Painel Master.

- `index.html` – vitrine pública (`?loja=nome-da-loja`)
- `painel.html` – painel da lojista
- `cadastro.html` – cadastro de nova loja
- `master.html` – Painel Master (aprovação, planos e vencimentos)
- `firestore.rules` – regras de segurança do Firebase (cópia de referência)

Os dados ficam no Firebase (projeto `plataforma-lojas-online`). O site é publicado pelo GitHub Pages.


## Validação

Execute `node tests/regression.cjs` (Node.js 18 ou superior). Os testes usam um banco simulado: validam vendas atômicas, estoque esgotado, preservação do histórico financeiro, conflitos entre aparelhos e cálculo do custo por quantidade. Não substituem testes das regras no Firebase nem testes com uma conta real.

## Publicar a proteção das anotações

Salvar `firestore.rules` no GitHub não publica as regras no Firebase.

1. Abra o projeto `plataforma-lojas-online` no Firebase Console.
2. Em Firestore Database → Regras, substitua o conteúdo pelo arquivo `firestore.rules` deste repositório e publique.
3. Abra `master.html` no site e entre com a administradora. O painel move automaticamente cada anotação antiga de `lojas/{slug}.masterNote` para `lojas/{slug}/privado/master.note`, removendo o campo público na mesma transação.
4. Confirme que não apareceu erro de migração. Antes dessa etapa, anotações antigas podem continuar nos documentos públicos. As novas anotações só são salvas no documento privado, acessível apenas ao Master.

O site continua sendo publicado pelo GitHub Pages. A publicação das regras exige acesso administrativo separado ao Firebase.
