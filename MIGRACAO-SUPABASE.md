# Versão Supabase do app Tropeiros do Bebedouro

Este código é o app exportado do Base44, adaptado para usar o Supabase
(projeto `xjeluakxtrvluzednjsf`) no lugar do Base44. As telas não mudaram:
o arquivo `src/api/base44Client.js` foi reescrito com a MESMA interface do SDK
do Base44, mas por dentro fala com o Supabase.

## O que mudou
- `src/api/base44Client.js` — adaptador (entidades, login, upload de arquivos, funções).
- `src/lib/AuthContext.jsx` — sessão pelo Supabase Auth.
- `src/pages/Login.jsx` + rota `/login` em `src/App.jsx` — tela de entrada
  (e-mail e senha, link por e-mail, criar conta, esqueci a senha).
- `vite.config.js` — sem o plugin do Base44; atalho `@` → `src`.
- `package.json` — sai `@base44/sdk` e `@base44/vite-plugin`, entra `@supabase/supabase-js`.
- Logo e imagens fixas copiadas para `public/img/` (antes ficavam no armazenamento do Base44).
- `public/sw.js` — o modo offline só guarda em cache arquivos públicos; nunca respostas do banco ou do login.
- `index.html` — título "Tropeiros do Bebedouro" e ícone do app.

## Como rodar
1. `npm install`
2. Copie `.env.example` para `.env` (valores públicos do projeto Supabase).
3. `npm run dev` (desenvolvimento) ou `npm run build` (gera a pasta `dist/` para publicar).

## Ainda falta (próximos passos)
- Edge Function `integracoes` (InvokeLLM com a API da Anthropic, SendEmail, SendSMS,
  GenerateImage, ExtractDataFromUploadedFile). Até lá, telas que usam IA mostram erro ao chamar.
- Portar as 9 funções do Base44 (`base44/functions/`) para Edge Functions.
- Configurar no Supabase (Authentication → URL Configuration) o endereço onde o app for publicado,
  para os links de e-mail (entrar sem senha, recuperar senha) voltarem ao lugar certo.
