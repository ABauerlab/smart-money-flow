# Regras de IA e Diretrizes do Projeto

Este documento descreve a pilha técnica e as regras específicas para o uso de bibliotecas no aplicativo Smart Money Flow Tracker.

## 1. Visão Geral da Pilha Técnica

O projeto é construído usando uma pilha moderna e focada em desempenho:

*   **Framework Frontend:** React com TypeScript (TSX).
*   **Ferramenta de Build:** Vite.
*   **Estilização:** Tailwind CSS para estilização utility-first, utilizando cores semânticas customizadas (bullish, bearish, warning).
*   **Biblioteca de UI:** shadcn/ui (baseada em Radix UI).
*   **Roteamento:** React Router DOM.
*   **Gerenciamento de Dados:** TanStack Query (React Query) para estado de servidor e cache.
*   **Backend/Fonte de Dados:** Supabase (usado para cache e execução de Edge Functions para APIs externas).
*   **Ícones:** Lucide React.
*   **Animações:** Framer Motion.
*   **Visualização de Dados:** Recharts.

## 2. Regras de Uso de Bibliotecas

Para manter a consistência e o desempenho, siga as seguintes diretrizes de uso de bibliotecas:

| Recurso | Biblioteca/Ferramenta Preferida | Regras Específicas |
| :--- | :--- | :--- |
| **Componentes de UI** | shadcn/ui | Use componentes existentes em `src/components/ui/`. Se precisar de customização, crie um novo componente que envolva o componente base. |
| **Estilização** | Tailwind CSS | Sempre use classes Tailwind. Utilize as cores semânticas customizadas (`text-bullish`, `bg-bearish`, etc.) definidas em `src/index.css`. Use a classe `glass-card` para painéis. |
| **Roteamento** | React Router DOM | Mantenha as definições de rota em `src/App.tsx`. Use `src/components/NavLink.tsx` para links de navegação. |
| **Busca de Dados** | TanStack Query (`useQuery`) | Use o hook `useMarketData` para dados principais. Todo novo estado de servidor deve usar TanStack Query. |
| **Ícones** | Lucide React | Use ícones importados de `lucide-react`. |
| **Animações** | Framer Motion | Use `framer-motion` para transições e animações de entrada/saída. |
| **Gráficos** | Recharts | Use Recharts para todos os componentes de visualização de dados. |
| **Notificações** | `sonner` & `useNotifications` | Use `Sonner` para toasts gerais. Use o hook customizado `useNotifications` para alertas de desktop e som. |
| **Utilitários** | Função `cn` | Use a função `cn` (de `src/lib/utils.ts`) para mesclar classes Tailwind condicionalmente. |

## 3. Diretrizes de Estrutura de Código

*   **Componentes:** Coloque todos os componentes reutilizáveis em `src/components/`.
*   **Páginas:** Coloque todos os componentes de rota em `src/pages/`.
*   **Hooks:** Coloque todos os hooks customizados em `src/hooks/`.
*   **Tipos:** Defina tipos compartilhados em `src/types/`.
*   **Responsividade:** Todos os novos componentes devem ser responsivos por padrão.