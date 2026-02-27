# Objetivo: Corrigir a arquitetura de layout da LeadsView e ContatosView.

O objetivo é transformar o dashboard em uma aplicação "Single Page" real, onde a rolagem acontece apenas dentro da tabela, mantendo os controles sempre visíveis.

## 1. Arquitetura de Contêiner (Flexbox High-Performance)
- Configure o contêiner pai da View para ocupar toda a altura da tela (`h-screen` ou `h-full`) usando `flex flex-col`.
- O cabeçalho (título e cards) deve ter altura natural.
- O contêiner da tabela deve usar `flex-1` e `min-h-0`. Isso força a tabela a ocupar exatamente o espaço restante da tela, ativando o scroll interno automaticamente.
- Adicione `overflow-hidden` ao pai e `overflow-auto` apenas ao contêiner da tabela. Isso garante que a barra de scroll horizontal apareça na base da área visível, e não no fim da lista de leads.

## 2. Expansão de Espaço (Layout Full-Width)
- Remova todas as restrições de largura máxima como `max-w-7xl` ou `max-w-screen-xl`.
- Utilize `w-full` ou `max-w-[98%]` com `mx-auto` para que o dashboard ocupe toda a largura disponível no monitor, eliminando as margens brancas laterais excessivas vistas nas imagens.

## 3. Usabilidade da Tabela de Leads
- **Cabeçalho Fixo:** Aplique `sticky top-0` e `z-10` ao `<thead>`. Ele deve permanecer visível enquanto o usuário rola os leads para baixo.
- **Coluna de Ação (Editar):** - Deve ser `sticky right-0` com `z-20`.
    - Deve ter um fundo sólido (bg-white ou bg-zinc) para não ficar transparente sobre os dados.
    - O botão de edição (lápis) deve estar sempre visível (remova o estado de hover/opacity).
    - Aplique uma cor de destaque `text-blue-600` no ícone para facilitar a identificação.

## 4. Estilização de Células
- Defina uma largura mínima razoável para colunas de texto longo (como 'Empresa' e 'Observações') para evitar que fiquem muito estreitas ou que estiquem a tabela de forma desordenada.
- Utilize `truncate` ou `line-clamp` se necessário para manter a altura das linhas uniforme.