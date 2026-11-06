# SDD v2 — ELEVATIO VENDAS MOBILE (shadcn Minimalist Edition)

> **Documento de Especificação de Design e Arquitetura de Software (SDD v2)** **Projeto:** Elevatio Vendas Mobile (iOS & Android) **Backend Compartilhado:** Supabase (`udqychpxnbdaxlorbhyw`) — PostgreSQL 17.6 + RLS + Edge Functions + Storage **Paradigma Visual:** shadcn/ui Mobile Minimalist (Zinc/Slate Neutral Palette + Brand Sky Blue `#0ea5e9` + Tipografia Inter/System)

## 1. VISÃO GERAL E DIRETRIZES INEGOCIÁVEIS

O **Elevatio Vendas Mobile** é a extensão nativa de alta performance do ecossistema SaaS Web. Esta versão (v2) substitui o protótipo inicial por uma arquitetura completa, espelhando os motores de negócio da aplicação Web (`AdminLeads`, `LeadDetailsSidebar`, `AdminProperties`, `AdminPropertyForm`, `AdminContracts`, `AdminFinance`, `AdminConfig` e `CrmNotificationsMenu`) sob uma interface minimalista inspirada no **shadcn/ui**.

### 1.1 Mudança de Tipografia (Remoção Definitiva da Sora)

* **Ação Obrigatória:** Desinstalar `@expo-google-fonts/sora` e remover qualquer referência a `Sora_*` em todos os arquivos (`_layout.tsx`, `tailwind.config.js` e estilos inline).

* **Nova Tipografia Oficial:** Família **Inter** (`@expo-google-fonts/inter` — Regular 400, Medium 500, SemiBold 600, Bold 700) ou fallback imediato para a fonte nativa do sistema (`System` / `San Francisco` no iOS / `Roboto` no Android), garantindo legibilidade técnica, kerning preciso em tabelas financeiras e zero peso visual excessivo.

### 1.2 Design System shadcn/ui Mobile (Tokens de Cor e Borda)

A interface adota superfícies neutras puras, bordas ultrafinas de `1px` e alto contraste tipográfico, reservando o Azul Elevatio (`#0ea5e9`) para ações primárias e indicadores ativos.

| Token Semântico | Light Mode (`light`) | Dark Mode (`dark` — Padrão) | Uso | 
| ----- | ----- | ----- | ----- | 
| `background` | `#fafafa` (Zinc 50) | `#09090b` (Zinc 950) | Fundo geral das telas | 
| `card` | `#ffffff` (White) | `#121215` (Zinc 900/Custom) | Superfície de cards, modais e drawers | 
| `mutedSurface` | `#f4f4f5` (Zinc 100) | `#18181b` (Zinc 900) | Inputs, pills inativas, blocos internos | 
| `border` | `#e4e4e7` (Zinc 200) | `#27272a` (Zinc 800) | Divisores, contornos de cards e inputs | 
| `text` | `#09090b` (Zinc 950) | `#f4f4f5` (Zinc 100) | Títulos, valores e texto principal | 
| `textMuted` | `#71717a` (Zinc 500) | `#a1a1aa` (Zinc 400) | Subtítulos, timestamps e metadados | 
| `brand` | `#0ea5e9` (Sky 500) | `#0ea5e9` (Sky 500) | Botões primários, links, tab ativa | 
| `brandSubtle` | `rgba(14,165,233,0.10)` | `rgba(14,165,233,0.14)` | Badges e fundos de ícones ativos | 
| `success` | `#10b981` (Emerald 500) | `#10b981` (Emerald 500) | Vendas fechadas, faturas pagas, SLA quente | 
| `warning` | `#f59e0b` (Amber 500) | `#f59e0b` (Amber 500) | Pendentes, aguardando assinatura, SLA morno | 
| `danger` | `#f43f5e` (Rose 500) | `#f43f5e` (Rose 500) | Atrasados, leads perdidos, SLA congelando | 

**Regras de Componentes shadcn Mobile:**

* **Cards:** `borderRadius: 16`, `borderWidth: 1`, `borderColor: colors.border`, `backgroundColor: colors.card`, sem sombras exageradas.

* **Badges / Pills:** `borderRadius: 8`, `paddingHorizontal: 8`, `paddingVertical: 3`, `borderWidth: 1` com cor semântica translúcida (`15%` opacidade no fundo e `30%` na borda).

* **Inputs:** `height: 46`, `borderRadius: 12`, `borderWidth: 1`, `borderColor: colors.border`, `backgroundColor: colors.mutedSurface`.

## 2. ARQUITETURA DE NAVEGAÇÃO E ROTAS (EXPO ROUTER)

A barra inferior (`(tabs)`) mantém exatamente **5 abas principais** para operação com o polegar. Módulos profundos (como a **Central de Contratos**, **Assinatura na Tela**, **Wizard de Imóvel** e **Central de Notificações**) abrem como rotas empilhadas (`Stack` / Modais) acionadas a partir do Início, Imóveis ou Configurações.

```
src/
├── types/
│   └── index.ts                        # Tipagem completa espelhada da Web (Lead, Property, Contract, etc.)
├── lib/
│   ├── supabase.ts                     # Cliente Supabase com AsyncStorage
│   └── permissions.ts                  # Motor RBAC (role + settings.permissions + profile.permissions)
├── context/
│   ├── ThemeContext.tsx                # Tokens shadcn (Light/Dark/System) em tempo real
│   └── AuthContext.tsx                 # Sessão, Profile, Company, Permissions e Refresh
├── components/
│   ├── ui/                             # Primitivos shadcn (Card, Badge, Button, Input, Sheet, Skeleton)
│   ├── notifications/
│   │   └── NotificationsModal.tsx      # Central de Notificações (Não lidas, Sistema, Equipe)
│   ├── leads/
│   │   ├── LeadCard.tsx                # Card minimalista despoluído (SLA em linha + tempos)
│   │   ├── LeadDetailsSheet.tsx        # Bottom Sheet completo (Timeline, Match IA, Tarefas, Infos)
│   │   ├── CloseSaleModal.tsx          # Modal de celebração de Venda Fechada + baixa de imóvel + XP
│   │   ├── LostLeadModal.tsx           # Modal de motivo de perda
│   │   ├── TransferLeadModal.tsx       # Modal de Roleta / Redistribuição de Lead (Admin/Manager)
│   │   └── NewLeadModal.tsx            # Criação rápida de lead manual
│   └── contracts/
│       ├── ContractReviewModal.tsx     # Revisão do dono, aprovação e envio para assinatura
│       └── SignatureTrackerModal.tsx   # Acompanhamento de signatários e cópia de links
└── app/
    ├── _layout.tsx                     # Root Stack (Auth, Tabs, Contracts, PropertyForm, SignaturePad)
    ├── (auth)/
    │   └── login.tsx                   # Login shadcn + Cloudflare Turnstile
    ├── (tabs)/
    │   ├── _layout.tsx                 # Bottom Tab Bar minimalista (5 abas)
    │   ├── index.tsx                   # Aba 1: Início (KPIs, Card de Contratos, Liga XP, Urgentes)
    │   ├── leads.tsx                   # Aba 2: Funil de Leads (Filtros de Funil/Etapa + Busca)
    │   ├── properties.tsx              # Aba 3: Portfólio de Imóveis (Filtros + Ações + Captação)
    │   ├── finance.tsx                 # Aba 4: ERP Financeiro / Minhas Comissões
    │   └── settings.tsx                # Aba 5: Ajustes (Foto Real, Perfil, PIX, Assinatura, Equipe)
    ├── contracts/
    │   └── index.tsx                   # Tela Secundária: Central de Contratos & Assinaturas
    ├── signature/
    │   └── index.tsx                   # Tela Secundária: Pad de Rubrica Digital (Desenhar/Salvar)
    └── property-form/
        └── index.tsx                   # Tela Secundária: Wizard de Cadastro/Edição com Câmera e Galeria

```

## 3. MATRIZ DE PERMISSÕES E REGRAS DE NEGÓCIO (PARIDADE WEB)

O arquivo `src/lib/permissions.ts` deve implementar a mesma lógica dos arquivos Web (`AdminLeads.tsx`, `AdminProperties.tsx`, `AdminContracts.tsx`, `AdminFinance.tsx`, `AdminConfig.tsx`):

1. **Hierarquia Base:**

   * `isSuperOrOwner`: `role === 'super_admin' || role === 'owner'`

   * `isManagerOrAdmin`: `role === 'manager' || role === 'admin'`

   * `isSoloBroker`: `company?.business_type === 'solo_broker'`

   * `isAssociatedBroker`: `role === 'corretor' && !isSoloBroker`

2. **Permissões Granulares (`user.profile.permissions` + `settings.permissions.role_permissions`):**

   * **Leads:**

     * `canViewTeamLeads`: `isSuperOrOwner || isManagerOrAdmin || perms.leads_view_team` (Se `false`, filtra `assigned_to === user.id` e oculta o funil `pre_atendimento`).

     * `canRedistributeLeads`: `isSuperOrOwner || isManagerOrAdmin || perms.leads_redistribute`.

     * `canDeleteLeads`: `isSuperOrOwner || isManagerOrAdmin || perms.leads_delete`.

   * **Imóveis:**

     * `canViewAllProperties`: `isSuperOrOwner || isManagerOrAdmin || perms.properties_view_all` (Se `false`, lista apenas `agent_id === user.id`).

     * `canCreateProperty`: `isSuperOrOwner || isManagerOrAdmin || perms.properties_create`.

     * `canEditProperty`: `isSuperOrOwner || isManagerOrAdmin || perms.properties_edit || property.agent_id === user.id`.

     * `canDeleteProperty`: `isSuperOrOwner || isManagerOrAdmin || perms.properties_delete`.

   * **Contratos:**

     * `canViewAllContracts`: `isSuperOrOwner || isManagerOrAdmin || perms.contracts_view_all` (Se `false`, filtra `broker_id === user.id || created_by === user.id`).

     * `canApproveContract`: `isSuperOrOwner || isManagerOrAdmin` (Revisão e aprovação de minutas enviadas por corretores).

   * **Financeiro:**

     * Se `isAssociatedBroker`: Renderiza **exclusivamente** a visão `Minhas Comissões` (`agent_commissions` onde `agent_id === user.id`).

     * Se `isSuperOrOwner || isManagerOrAdmin || isSoloBroker`: Renderiza o **Caixa Inteligente ERP** completo.

## 4. ESPECIFICAÇÃO FUNCIONAL MÓDULO A MÓDULO

### 4.1 Aba 1: Início (`src/app/(tabs)/index.tsx`) + Central de Notificações

1. **Header Minimalista:**

   * Exibe o **Avatar Real** do usuário (`profile.avatar_url` via componente `<Image />` com fallback para iniciais), primeiro nome, badge discreta do cargo e nome da imobiliária.

   * Botão de **Olho de Privacidade** (oculta todos os valores monetários e contadores sensíveis).

   * Botão de **Sino de Notificações** (`CrmNotificationsMenu` adaptado para mobile) com badge numérica de não lidas (`notifications` onde `read === false`). Ao tocar, abre o `NotificationsModal` com abas `Não lidas`, `Sistema` e `Equipe`, permitindo marcar como lida e navegar diretamente para o Lead ou Contrato.

2. **Card Clicável de Contratos & Assinaturas (Destaque no Início):**

   * Posicionado logo abaixo dos KPIs principais, pois Contratos não fica na barra inferior.

   * Exibe contadores em tempo real da tabela `contracts` + `contract_signatures`:

     * **Ativos / Assinados** (badge emerald)

     * **Pendentes de Assinatura** (badge amber)

     * **Aguardando Revisão** (`status === 'pending'` ou `'draft'`)

   * Ao tocar no card, navega para `/contracts` (`src/app/contracts/index.tsx`).

3. **Card Compacto da Liga dos Corretores (Gamificação):**

   * Nível atual (`profile.level`), título (`profile.level_title`), XP total (`profile.xp_points`) e barra de progresso minimalista até o próximo nível.

4. **Atenção Imediata:**

   * Lista os 5 leads mais urgentes aguardando atendimento ou com interação atrasada, permitindo abrir os detalhes com 1 toque.

### 4.2 Aba 2: Leads & CRM (`src/app/(tabs)/leads.tsx`)

#### A. Design Despoluído do `LeadCard.tsx` (Correção Obrigatória)

O card de lead foi redesenhado para leitura rápida sem poluição visual:

* **Sem emojis no indicador de temperatura:** Removido qualquer texto como `"Quente 🔥"` ou `"Congelando ❄️"`.

* **Indicador de SLA Minimalista:** Uma barra de progresso/indicador fino (`height: 3px`) ou ponto colorido discreto (`6x6px`) usando apenas cor semântica:

  * `<= 24h` desde `last_interaction`: Emerald (`#10b981`)

  * `24h a 48h`: Amber (`#f59e0b`)

  * `> 48h` ou sem interação: Rose (`#f43f5e`)

* **Métricas Temporais Obrigatórias no Rodapé do Card:**

  * `Nesta etapa: {formatTimeInStage(lead.stage_updated_at || lead.created_at)}` (ex: `Nesta etapa: 2d` ou `4h`)

  * `Atualizado: há {formatTimeInStage(lead.last_interaction || lead.created_at)}` (ex: `Atualizado: há 18m`)

* **Estrutura Limpa do Card:**

  1. **Topo:** Nome do Lead (`font-semibold text-base`) + Badge discreta do Status atual à direita.

  2. **Meio:** Título do imóvel de interesse (`lead.property?.title || 'Interesse Geral'`) + Tag discreta da origem (`lead.source`) e nome do corretor responsável (se visão Admin).

  3. **Base:** Tempos (`Nesta etapa` • `Atualizado`) + Linha fina de SLA + 2 ações compactas (`WhatsApp` e `Detalhes`).

#### B. Seletor de Funis e Etapas (Paridade com `AdminLeads.tsx`)

* Carrega `settings.kanban_config` da empresa (com fallback para a configuração padrão de 5 funis: `pre_atendimento`, `atendimento`, `proposta`, `venda_ganha`, `perdido`).

* Barra superior permite filtrar por Funil ou buscar por nome/telefone.

* Botão `+ Novo Lead` abre `NewLeadModal.tsx` respeitando a regra `settings.route_to_central` (se ativo em imobiliária, entra em `pre_atendimento`; caso contrário, entra em `atendimento` atribuído ao usuário).

#### C. Bottom Sheet de Detalhes do Lead (`LeadDetailsSheet.tsx`)

Ao tocar em um card, abre um modal/sheet completo espelhando a `LeadDetailsSidebar.tsx` da Web:

1. **Header Fixo:** Nome do lead, badge de Score comportamental, botões rápidos `WhatsApp` e `Ligar`, e estimativa de pontos XP da Liga (`Fechar este negócio rende aprox. X pts`).

2. **Stepper de Etapa do Funil:**

   * Permite alternar entre os funis (`Pré-atend.`, `Atend.`, `Proposta`, `Fechado`, `Perdido`) e selecionar o sub-status correspondente.

   * **Gatilhos Automáticos ao Mudar Etapa:**

     * Se mover de `pre_atendimento` para atendimento (e `canRedistributeLeads`): abre `TransferLeadModal` (Roleta de Corretores) para escolher o corretor e inserir nota de qualificação.

     * Se mover para `venda_ganha` / `Fechado`: abre `CloseSaleModal` exigindo confirmação do imóvel vendido (`selectedSoldPropertyId`) e valor final negociado (`deal_value`). Ao confirmar:

       1. Atualiza `leads` (`status: 'Fechado'`, `funnel_step: 'venda_ganha'`, `deal_value`, `property_id`).

       2. Atualiza `properties` (`status: 'Vendido'`).

       3. Grava evento de celebração em `timeline_events`.

       4. Dispara notificação para os gestores em `notifications`.

       5. Credita XP na tabela `gamification_events`.

     * Se mover para `perdido`: abre `LostLeadModal` com os motivos configurados (`Sem contato`, `Valor Alto`, `Sem Entrada`, etc.).

3. **Abas Internas do Lead (`Timeline`, `Match IA`, `Tarefas`, `Imóveis`, `Perfil`):**

   * **Timeline:** Lista cronológica de `timeline_events` com autor e data. Campo de texto rápido para adicionar nota (`type: 'note'`), que atualiza `last_interaction` do lead, permite edição/exclusão em até 5 minutos pelo autor e notifica o corretor/gestor.

   * **Match IA:** Cruza `budget` (+/- 20%), `desired_type`, `desired_bedrooms` e `desired_location` com a tabela `properties` (`status === 'Disponível'`), calcula o score de compatibilidade, salva em `lead_matches` e permite enviar a sugestão com link do imóvel direto no WhatsApp do cliente.

   * **Tarefas:** Lista `tasks` vinculadas ao lead (`lead_id`), permite criar nova tarefa e dar check (`completed`), gravando log na timeline.

   * **Imóveis & Navegação:** Exibe o imóvel de origem, permite adicionar/remover imóveis de interesse (`interested_properties`) e lista as páginas visitadas pelo cliente (`navigation_data`).

   * **Perfil:** Edição rápida de E-mail, Orçamento (`budget`), Tipo desejado (`desired_type`), Quartos mínimos (`desired_bedrooms`), Localização desejada (`desired_location`) e transferência de corretor responsável.

### 4.3 Módulo de Contratos & Assinaturas (`src/app/contracts/index.tsx` e `src/app/signature/index.tsx`)

Acessado a partir do Card de Contratos na aba **Início** (ou pelas Configurações):

1. **KPIs e Filtros:**

   * Resumo no topo: Vendas Ativas + VGV, Locações Ativas + MRR, e Contratos Pendentes.

   * Pílulas de filtro: `Todos`, `Vendas`, `Locações`, `Captação / Admin`.

2. **Fluxo de Revisão e Aprovação do Dono/Gestor:**

   * Contratos criados por corretores chegam com `status === 'pending'` ou `'draft'`.

   * O Dono/Gerente toca no contrato para abrir o `ContractReviewModal.tsx`:

     * Visualiza o resumo comercial (Imóvel, Cliente/Lead, Corretor, Valor Total, Comissão, Vigência) e a prévia do texto/minuta (`html_content` / `content`).

     * Botão **"Aprovar e Liberar para Assinatura"**: atualiza o status e habilita a coleta de assinaturas.

3. **Fluxo de Assinatura Digital no App:**

   * Botão **"Assinar Contrato"**:

     * Verifica se o usuário já possui assinatura salva em `profile.signature_url` (ou `company.admin_signature_url` quando assina pela imobiliária).

     * **Se já tiver assinatura salva:** Exibe prévia da rubrica salva e botão `"Assinar com minha rubrica salva"` (com opção `"Criar nova assinatura"`).

     * **Se não tiver assinatura salva:** Redireciona para `/signature` (`src/app/signature/index.tsx`), onde o usuário desenha a rubrica na tela ou digita o nome, salva a imagem no Supabase Storage (`avatars` ou `company-assets`), atualiza `profiles.signature_url` e aplica no contrato.

     * Ao confirmar a assinatura no contrato, atualiza/insere o registro correspondente em `contract_signatures` (`status: 'signed'`, `signed_at: new Date().toISOString()`, `signature_image`).

4. **Modal de Acompanhamento de Signatários (`SignatureTrackerModal.tsx`):**

   * Lista todos os signatários de `contract_signatures` vinculados ao `contract_id` (Proprietário, Comprador/Locatário, Corretor, Testemunhas).

   * Mostra o status individual (`Assinado` em verde com timestamp, `Pendente` em âmbar, `Recusado` em vermelho) e alerta se faltar apenas assinatura de testemunha.

   * Permite adicionar novo signatário (gerando token UUID) e enviar/copiar o link público de assinatura direto para o WhatsApp da parte.

### 4.4 Aba 3: Imóveis & Captação na Rua (`src/app/(tabs)/properties.tsx` e `src/app/property-form/index.tsx`)

1. **Portfólio de Imóveis (`properties.tsx`):**

   * Cards de KPIs no topo: Total, Disponíveis, Concluídos (Vendidos/Alugados) e Pendências Jurídicas (`!has_intermediation_signed`).

   * Filtros em pílulas: `Todos`, `Venda`, `Aluguel`, `Temporada`, `Pendências Jurídicas`, `Arquivados` + toggle **"Apenas meus imóveis"** (`agent_id === user.id`).

   * Busca por título/bairro e ordenação (`Mais recentes`, `Menor preço`, `Maior preço`).

   * **Ações Rápidas no Card do Imóvel:**

     * Switch rápido para publicar/ocultar do site (`Disponível` ↔ `Inativo`).

     * Botão de estrela para destacar imóvel (`featured`).

     * Badge de status jurídico (com atalho para abrir o modal de assinaturas do contrato de intermediação).

     * Menu de ações: `Editar Imóvel`, `Marcar como Vendido/Alugado`, `Compartilhar no WhatsApp`.

2. **Wizard de Captação e Edição (`src/app/property-form/index.tsx`):**

   * Formulário dividido em etapas limpas (Básico, Detalhes & Endereço, Proprietário, Fotos):

     * **Básico:** Modalidade (`Venda`, `Aluguel`, `Temporada`), Tipo de imóvel, Título, Preço (ou Diária/Taxa de limpeza/Caução/Hóspedes para Temporada), Condomínio e IPTU.

     * **Detalhes & Endereço:** Quartos, Suítes, Banheiros, Vagas, Área Total/Construída, CEP com preenchimento automático via **ViaCEP** (`viacep.com.br`), Rua, Bairro, Cidade, UF, comodidades e geração de descrição com IA.

     * **Proprietário (Sigiloso para Contratos):** Nome, CPF/CNPJ, Estado Civil, Telefone, E-mail e Chave PIX para repasse (`owner_pix_type`, `owner_pix_key`).

     * **Fotos com Câmera e Galeria (`expo-image-picker`):**

       * Botão **"Tirar Foto com a Câmera"** (`ImagePicker.launchCameraAsync`) para captação na rua e botão **"Escolher da Galeria"** (`ImagePicker.launchImageLibraryAsync` com seleção múltipla).

       * Upload direto do binário para o bucket `properties` no caminho `${company_id}/${property_id}/${timestamp}.${ext}`, populando o array `images` do imóvel.

### 4.5 Aba 4: Financeiro ERP (`src/app/(tabs)/finance.tsx`)

1. **Seletor de Competência (`YYYY-MM`):** Permite alternar o mês/ano analisado no topo da tela.

2. **Modo Corretor Associado (`role === 'corretor' && !isSoloBroker`):**

   * Exibe **exclusivamente** `Minhas Comissões` (consulta `agent_commissions` filtrada por `agent_id === user.id` e período).

   * Cards de resumo: `Liberado a Receber`, `Recebido no Mês` e `Aguardando Escritura/Bloqueado`.

   * Card de conferência da Chave PIX cadastrada com atalho para editar em Ajustes.

   * Extrato detalhado das comissões.

3. **Modo Caixa Inteligente ERP (`owner`, `manager`, `admin`, `solo_broker`):**

   * Hero Card minimalista estilo shadcn/Nubank com **Saldo Líquido do Mês**, total de **Entradas (Pagas)**, **A Receber** e **Saídas (Despesas + Comissões)**.

   * Sub-abas horizontais:

     * `Visão Geral`: Resumo do fluxo de caixa semanal e próximos vencimentos em 7 dias.

     * `A Receber` (`invoices`): Filtro por status (`Todos`, `Pendentes`, `Atrasados`, `Pagos`), botão para **Dar Baixa (Pago)**, botão **Cobrar no WhatsApp** (com mensagem formatada e link) e botão **Nova Cobrança**.

     * `A Pagar` (`operating_expenses` + `agent_commissions`): Lista despesas operacionais e comissões da equipe, permitindo cadastrar nova despesa (`Utilidades`, `Pessoal`, `Marketing`, `Tecnologia`, etc.) e alternar status `pending` ↔ `paid`.

     * `Repasses`: Acompanhamento de valores retidos e repasses a proprietários.

### 4.6 Aba 5: Configurações & Perfil (`src/app/(tabs)/settings.tsx`)

Redesenhada do zero no padrão shadcn para exibir todos os dados reais da conta:

1. **Card Principal de Perfil com Foto Real:**

   * Renderiza a foto real salva em `profile.avatar_url` usando `<Image source={{ uri: profile.avatar_url }} />` (com fallback elegante de iniciais apenas se `avatar_url` for nulo).

   * Botão sobreposto de câmera no avatar para **trocar a foto de perfil** direto pelo celular (`expo-image-picker` $\rightarrow$ upload para o bucket `avatars` $\rightarrow$ atualiza `profiles.avatar_url` e chama `refreshUser()`).

   * Exibe Nome completo, E-mail de login, Badge de Cargo (`Dono`, `Gerente`, `Corretor`), CRECI e Nome da Imobiliária/Plano atual.

2. **Seção Meus Dados Profissionais (Editável):**

   * Modal ou formulário inline para editar e salvar em `profiles`:

     * `name` (Nome Completo)

     * `phone` (WhatsApp com DDI)

     * `creci` (Registro CRECI)

     * `document` / `cpf_cnpj` (CPF ou CNPJ)

3. **Seção Recebimentos & Chave PIX (Editável):**

   * Edição direta de `pix_key` e `bank_info` (`bank_name`, `agency`, `account`, `pix_type`, `pix_key`), salvando na tabela `profiles`.

4. **Seção Assinatura Jurídica Digital:**

   * Exibe a prévia da assinatura salva (`profile.signature_url` e, se for `owner`, `company.admin_signature_url`).

   * Botão **"Criar / Alterar Assinatura"** que abre a tela `/signature` para desenhar ou digitar a rubrica.

5. **Atalhos de Gestão e Preferências:**

   * Atalho rápido para **Central de Contratos** (`/contracts`).

   * Seletor de Tema em 3 estados (`Escuro`, `Claro`, `Sistema`).

   * Alteração de senha (`supabase.auth.updateUser({ password })`) e botão de **Encerrar Sessão**.