# Prompt: Implementação de Campos Dropdown com Cores e Integridade de Dados

Este prompt foca exclusivamente na refatoração e adição da lógica de campos personalizados do tipo "Dropdown" para o dashboard existente.

## 1. Contexto de Dados (Supabase)
As tabelas envolvidas no processo são:
- `lead_field_config`: Onde o campo `options` (JSONB) armazena `[{ "label": "Status", "color": "#hex" }]`.
- `leads`: Onde a coluna `metadata` (JSONB) armazena o valor selecionado (string).

## 2. Requisitos da Interface de Configuração (Settings View)
- **Criação de Campo:** Ao selecionar o tipo "Dropdown", habilitar uma seção dinâmica para gerenciar opções.
- **Gerenciador de Opções:** O usuário deve poder adicionar, remover e editar opções. Cada opção deve ter:
    - Um input de texto para a `label`.
    - Um seletor de cor (input type color ou paleta hexadecimal).
- **Serialização:** O estado deve ser transformado no array JSONB `[{ "label": "...", "color": "..." }]` antes do salvamento em `lead_field_config`.

## 3. Lógica de Integridade (Auto-Sync)
- **Evento de Renomeação:** Caso o usuário altere o texto de uma `label` de uma opção existente, o sistema deve disparar uma operação em lote (batch update) no Supabase.
- **Ação:** Atualizar todos os registros na tabela `leads` daquela empresa específica onde o valor antigo da label existia dentro da coluna `metadata` para o novo valor da label.
- **Objetivo:** Garantir que o histórico de dados não seja perdido e que os gráficos não exibam categorias duplicadas ou órfãs.

## 4. Modal de Edição de Leads
- **Renderização Dinâmica:** Identificar campos com `field_type === 'dropdown'`.
- **Componente:** Substituir o input de texto padrão por um componente `<select>` estilizado com Tailwind.
- **Opções:** O select deve ser populado pelas labels presentes no campo `options` da configuração correspondente.

## 5. Visualização (Gráficos Inteligentes com Recharts)
- **Mapeamento de Cores:** Ao gerar gráficos de barras ou pizza para campos dropdown, o código deve buscar a cor correspondente à label no array `options`.
- **Fallback:** Se um valor presente no lead não for encontrado nas opções atuais da configuração, renderizar a fatia/barra na cor cinza neutra (#d1d5db).

## 6. Requisitos Técnicos
- Manter a estrutura de arquivo único (.jsx).
- Utilizar `supabase-js` para as queries de atualização em lote.
- Garantir que o estado local do React seja atualizado imediatamente após a sincronização com o banco.

Sempre que uma Label de dropdown for editada, execute uma query de update na tabela 'leads' filtrando pelo 'company_id' e pelo valor antigo dentro do JSONB de metadata para garantir a consistência dos dados.