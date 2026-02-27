Você é um desenvolvedor frontend sênior especializado em dashboards SaaS.
Crie um dashboard web completo em React (single file .jsx) usando apenas
Tailwind CSS para estilização. O app se conecta ao Supabase como backend.

═══════════════════════════════════════════════════════
CREDENCIAIS SUPABASE
═══════════════════════════════════════════════════════
Supabase URL: https://weqphypbqgwxvhfvzlov.supabase.co
Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlcXBoeXBicWd3eHZoZnZ6bG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDM2NjUsImV4cCI6MjA4NzUxOTY2NX0.87YcF70OUhkHDEQlxBwrksULNSax2QDSPDdVZcP6Ftw

Use o client oficial:
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

═══════════════════════════════════════════════════════
SCHEMA DO BANCO (referência — não crie tabelas)
═══════════════════════════════════════════════════════

-- profiles: id (uuid, fk auth.users), nome, company_id, created_at
-- companies: id, name, nome_empresa, fluxo_ativo, max_users, max_contacts
-- contacts: id, company_id, name, telefone, data_da_coleta, hora_da_coleta,
--           ultimo_disparo, hora_ultimo_disparo, mensagem_disparada,
--           ultima_resposta, local, quantidade_de_disparos
-- leads: id, company_id, name, telefone, resposta, foi_resposta_manual,
--        ai_briefing, demonstrou_interesse, metadata (jsonb), created_at
-- lead_field_config: id, company_id, field_key, field_label, field_type
--                    (text|number|boolean|date), column_order, is_required

O RLS já está ativo. Todas as queries retornam apenas dados da empresa
do usuário logado automaticamente — não é necessário filtrar por company_id
manualmente nas queries do frontend.

═══════════════════════════════════════════════════════
FLUXO DE AUTENTICAÇÃO
═══════════════════════════════════════════════════════

1. App inicia → verifica sessão ativa via supabase.auth.getSession()
2. Sem sessão → exibe tela de LOGIN
3. Com sessão → carrega profile do usuário e entra no dashboard

TELA DE LOGIN:
- Layout centralizado, fundo cinza muito claro (#f9fafb)
- Card branco com sombra suave, logo/título "Dashboard" no topo
- Campos: Email e Senha
- Botão "Entrar" — chama supabase.auth.signInWithPassword()
- Mensagem de erro inline se credenciais inválidas
- Visual limpo, sem cadastro (usuários são criados manualmente no Supabase)
TELA DE LOGIN — BRANDING:
- O card de login tem fundo branco (light) ou fundo zinc-900 (dark)
- No topo do card, exibir a logo conforme o modo ativo:
  • Light mode: <img src="/black_logo.png" alt="Orbital IA" class="h-10 mx-auto mb-2" />
  • Dark mode:  <img src="/logo.png"       alt="Orbital IA" class="h-10 mx-auto mb-2" />
- Abaixo da logo, texto "Orbital IA" discreto (text-sm font-medium,
  text-gray-400 no light / text-gray-500 no dark)
- Abaixo, separador sutil e título "Dashboard" em texto maior
- Rodapé do card: "Powered by Orbital IA" em text-xs text-gray-300

LOGOUT:
- Botão discreto no canto superior direito da sidebar
- Chama supabase.auth.signOut() e volta para o login

═══════════════════════════════════════════════════════
ESTRUTURA DO DASHBOARD
═══════════════════════════════════════════════════════

Layout: sidebar fixa à esquerda (220px) + área de conteúdo principal

SIDEBAR:
- Nome da empresa (vindo de companies.nome_empresa ou companies.name)
- Nome do usuário logado (profiles.nome)
- Itens de navegação com ícone + label:
  • Leads (ícone: target/funil)
  • Contatos (ícone: users)
  • Configurações (ícone: settings)
- Botão Sair no rodapé da sidebar
- Cor de fundo: branco. Item ativo com fundo cinza claro e texto escuro.
SIDEBAR — BRANDING:
- No rodapé da sidebar, abaixo do botão Sair, linha separadora e assinatura:
  • Light mode: black_logo.png + texto "Orbital IA" em text-gray-400
  • Dark mode:  logo.png       + texto "Orbital IA" em text-gray-300
  Logo h-4, texto text-xs — elemento de assinatura, não de destaque
- Topo da sidebar: nome/logo do cliente, nunca da Orbital IA

═══════════════════════════════════════════════════════
VIEW 1 — LEADS
═══════════════════════════════════════════════════════

CARDS DE RESUMO no topo (linha com 4 cards):
- Total de Leads
- Demonstraram Interesse (demonstrou_interesse = true)
- Respostas Manuais (foi_resposta_manual = true)
- Leads Hoje (created_at = data de hoje)

FILTROS (abaixo dos cards, linha horizontal):
- Campo de busca por nome ou telefone (busca local no array já carregado)
- Filtro dropdown: Interesse → Todos | Com interesse | Sem interesse
- Filtro dropdown: Tipo resposta → Todos | Manual | Automática
- Filtro de data: De / Até (filtra por created_at)
- Botão "Limpar filtros"

TABELA DE LEADS:
- Colunas fixas (sempre visíveis):
  name, telefone, demonstrou_interesse (badge verde/cinza), 
  foi_resposta_manual (badge), created_at (formatado dd/mm/aaaa)
- Colunas dinâmicas: buscadas de lead_field_config ordenadas por column_order.
  Para cada config, exibir o valor de lead.metadata[field_key] formatado
  conforme field_type:
    • number → valor numérico
    • boolean → badge Sim/Não
    • date → dd/mm/aaaa
    • text → texto simples
- Coluna de ações no final: ícone de editar (lápis)
- Paginação simples: 20 itens por página, botões Anterior / Próximo
- Linha clicável ou botão de editar abre o MODAL DE EDIÇÃO

MODAL DE EDIÇÃO DE LEAD:
- Título: "Editar Lead"
- Campos editáveis (com label claro):
  • name (text input)
  • telefone (text input)
  • resposta (textarea)
  • foi_resposta_manual (toggle/checkbox)
  • ai_briefing (textarea)
  • demonstrou_interesse (toggle/checkbox)
  • Campos do metadata: renderizados dinamicamente conforme lead_field_config
    da empresa. Para cada config exibir input do tipo correto:
      - text → <input type="text">
      - number → <input type="number">
      - boolean → <input type="checkbox"> ou toggle
      - date → <input type="date">
- Campos que NÃO devem aparecer (nunca editáveis pelo usuário):
  id, company_id, created_at, updated_at
- Botões: "Salvar" e "Cancelar"
- Salvar faz update apenas nos campos permitidos + reconstrói o objeto
  metadata com os novos valores e faz upsert
- Feedback visual: botão mostra "Salvando..." durante o request,
  mensagem de sucesso ou erro após

═══════════════════════════════════════════════════════
VIEW 2 — CONTATOS
═══════════════════════════════════════════════════════

CARDS DE RESUMO:
- Total de Contatos
- Disparos Hoje (ultimo_disparo = hoje)
- Média de Disparos por Contato

FILTROS:
- Busca por nome ou telefone
- Filtro por local (dropdown com valores únicos do campo local)
- Filtro de data de coleta: De / Até

TABELA DE CONTATOS:
Colunas: name, telefone, local, data_da_coleta, ultimo_disparo,
         quantidade_de_disparos, ultima_resposta (truncada em 60 chars com tooltip)
- Paginação simples: 20 por página

(Contatos são somente leitura nesta view — sem edição)

═══════════════════════════════════════════════════════
VIEW 3 — CONFIGURAÇÕES
═══════════════════════════════════════════════════════

Dividida em duas seções:

SEÇÃO 1 — CAMPOS PERSONALIZADOS DE LEADS:
- Tabela listando os registros de lead_field_config da empresa:
  Colunas: Label, Chave (field_key), Tipo, Obrigatório, Ordem, Ações
- Botão "Novo Campo" abre modal para criar:
  • field_label (text input)
  • field_key (text input, sugerido automaticamente como slug do label em snake_case,
    editável, sem espaços)
  • field_type (select: text | number | boolean | date)
  • column_order (number input)
  • is_required (checkbox)
  Insert em lead_field_config com o company_id do usuário logado
- Ícone de editar em cada linha abre modal de edição do campo
  (permite alterar label, tipo, ordem, obrigatório — NÃO permite alterar field_key
   após criado pois quebraria dados existentes no metadata)
- Ícone de deletar: confirmação inline ("Tem certeza?") antes de deletar

SEÇÃO 2 — INFORMAÇÕES DA EMPRESA (somente leitura):
- Exibe: nome_empresa, name, fluxo_ativo (badge), max_users, max_contacts
- Visual de card simples, sem edição

═══════════════════════════════════════════════════════
MODO ESCURO (DARK MODE)
═══════════════════════════════════════════════════════

- Implementar dark mode completo, controlado por estado React (não por
  prefers-color-scheme do sistema, mas com um botão de toggle manual)
- O toggle fica no canto superior direito do header/topbar do dashboard,
  ícone de sol (☀) no dark mode e lua (☽) no light mode
- Na tela de login o toggle também deve estar visível (canto superior direito
  da tela, fora do card)
- O estado do modo deve ser salvo em localStorage para persistir entre sessões

PALETA DARK MODE:
  Fundo principal:     bg-zinc-950
  Fundo sidebar:       bg-zinc-900
  Cards e modais:      bg-zinc-800
  Bordas:              border-zinc-700
  Texto primário:      text-zinc-100
  Texto secundário:    text-zinc-400
  Hover em linhas:     bg-zinc-800
  Botão primário:      bg-blue-600 hover:bg-blue-500 (igual ao light)
  Badges positivos:    bg-green-900 text-green-300
  Badges negativos:    bg-zinc-700 text-zinc-300
  Input background:    bg-zinc-700 border-zinc-600 text-zinc-100

PALETA LIGHT MODE (manter a original):
  Fundo principal:     bg-gray-50
  Fundo sidebar:       bg-white
  Cards e modais:      bg-white
  Bordas:              border-gray-200
  Texto primário:      text-gray-900
  Texto secundário:    text-gray-500
  Hover em linhas:     bg-gray-50
  Botão primário:      bg-blue-700 hover:bg-blue-800
  Badges positivos:    bg-green-100 text-green-700
  Badges negativos:    bg-gray-100 text-gray-500
  Input background:    bg-white border-gray-300 text-gray-900

REGRA CRÍTICA DE LOGOS:
  - /logo.png       → logo BRANCA → usar SOMENTE em fundos escuros (dark mode)
  - /black_logo.png → logo PRETA  → usar SOMENTE em fundos claros (light mode)
  - Em todo lugar que a logo aparecer (login + sidebar), verificar o modo
    ativo antes de decidir qual arquivo carregar
  - Nunca usar logo.png em fundo claro ou black_logo.png em fundo escuro

═══════════════════════════════════════════════════════
REQUISITOS TÉCNICOS
═══════════════════════════════════════════════════════

- React com hooks (useState, useEffect, useMemo, useCallback)
- Sem biblioteca de componentes externa além do Tailwind
- Sem React Router — navegação por estado (activeView)
- Carregar leads e lead_field_config juntos ao entrar na view de Leads
- Carregar contacts ao entrar na view de Contatos
- Filtros aplicados localmente no array já carregado (sem query nova por filtro)
- Tratar loading state com skeleton ou spinner simples em cada tabela
- Tratar erro de conexão com mensagem amigável
- Datas sempre formatadas como dd/mm/aaaa no Brasil
- Números com locale pt-BR
- O arquivo final deve ser um único .jsx funcional e autocontido

═══════════════════════════════════════════════════════
ESTILO VISUAL
═══════════════════════════════════════════════════════

- Paleta: branco, cinzas (#f3f4f6, #e5e7eb, #6b7280, #111827), 
  destaque único em azul escuro (#1d4ed8) para botões primários e item ativo
- Tipografia: system font stack, tamanho base 14px
- Sem bordas arredondadas excessivas (rounded-md no máximo)
- Tabelas com linhas separadas por border-b, sem fundo alternado
- Badges simples: texto pequeno com fundo colorido leve (sem bordas)
  Verde para positivo, cinza para negativo/neutro, azul para informativo
- Modais: overlay escuro semitransparente, card centralizado com sombra
- Nenhuma animação complexa — apenas transition suave no hover das linhas
- Ícones: use caracteres unicode ou SVG inline simples (sem biblioteca de ícones)