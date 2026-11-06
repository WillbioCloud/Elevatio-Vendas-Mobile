# SDD v1 — ELEVATIO VENDAS MOBILE (React Native + Expo + Supabase)

## 1. VISÃO GERAL E IDENTIDADE VISUAL
Aplicativo móvel nativo (iOS e Android) do ecossistema **Elevatio Vendas SaaS**, conectado ao mesmo backend Supabase (`udqychpxnbdaxlorbhyw`) da plataforma Web.

### 1.1 Tipografia Oficial (Obrigatória)
- **Fonte Principal:** `Sora` (`@expo-google-fonts/sora`) aplicada globalmente em 100% dos textos, títulos, botões e números financeiros.
- Pesos utilizados:
  - `Sora_400Regular` (corpo e descrições)
  - `Sora_600SemiBold` (labels, subtítulos e badges)
  - `Sora_700Bold` (títulos de seções e botões)
  - `Sora_800ExtraBold` (valores monetários estilo Nubank e KPIs)

### 1.2 Paleta de Cores (Azul Oficial da Logo + Dark/Light Mode)
- **Brand Primary (Azul Elevatio):**
  - `brand-50`: `#eff6ff`
  - `brand-100`: `#dbeafe`
  - `brand-400`: `#38bdf8`
  - `brand-500`: `#0ea5e9` (Cor principal de destaque e botões primários)
  - `brand-600`: `#0284c7` (Hover / Press state)
  - `brand-700`: `#0369a1`
  - `brand-900`: `#0c4a6e`
  - `brand-950`: `#082f49`
- **Light Mode (Tema Claro):**
  - Fundo Principal (`bg-primary`): `#f8fafc` (Slate 50)
  - Superfície / Cards (`bg-card`): `#ffffff` (White)
  - Texto Principal: `#0f172a` (Slate 900)
  - Texto Secundário: `#64748b` (Slate 500)
  - Bordas: `#e2e8f0` (Slate 200)
- **Dark Mode (Tema Escuro — Padrão Premium):**
  - Fundo Principal (`bg-primary`): `#0a0f1c` (Deep Navy/Slate)
  - Superfície / Cards (`bg-card`): `#111827` / `#1e293b`
  - Texto Principal: `#f8fafc` (Slate 50)
  - Texto Secundário: `#94a3b8` (Slate 400)
  - Bordas: `#1e293b` (Slate 800)
- **Semânticas Financeiras:**
  - Entradas / Pago (`emerald`): `#10b981`
  - Saídas / Atrasado (`rose`): `#f43f5e`
  - Atenção / Bloqueado (`amber`): `#f59e0b`

---

## 2. STACK TECNOLÓGICA MOBILE
- **Framework:** React Native com **Expo SDK 52+** (Expo Router / React Navigation).
- **Estilização:** **NativeWind v4** (Tailwind CSS para React Native) configurado com a família `Sora` e suporte nativo a `dark` / `light` mode via `useColorScheme()`.
- **Backend & Auth:** `@supabase/supabase-js` com persistência segura de sessão em `@react-native-async-storage/async-storage` ou `expo-secure-store`.
- **Segurança & Recursos Nativos:**
  - `expo-local-authentication` (FaceID / TouchID / Biometria para abrir o Caixa e aprovar repasses).
  - `expo-image-picker` & `expo-camera` (tirar fotos de imóveis e comprovantes direto da rua).
  - `expo-sharing` & `Linking` (disparo direto para WhatsApp `whatsapp://send?phone=...`).
  - `lucide-react-native` (mesmos ícones da versão Web).

---

## 3. ARQUITETURA DE NAVEGAÇÃO E MÓDULOS (MVP FUNCIONAL IMEDIATO)

### 3.1 Autenticação e Gatekeeper de Planos (`(auth)/login.tsx`)
- Login com E-mail e Senha via `supabase.auth.signInWithPassword`.
- Carrega `profiles` + `companies` + `saas_contracts`.
- Valida o plano da empresa:
  - `starter` / `basic`: Exibe tela de Upgrade para o Plano Pro/Corporate.
  - `pro`: Permite até 3 usuários ativos no App (`mobile_access_enabled`).
  - `corporate` / `elite`: Acesso total irrestrito para toda a equipe.

### 3.2 Aba 1: Início / Dashboard (`(tabs)/index.tsx`)
- Header com avatar, saudação, badge do cargo/plano e toggle rápido de Dark/Light mode + olho de privacidade (ocultar valores em R$).
- Resumo de Performance: Leads novos hoje, Visitas agendadas, Imóveis ativos e Card da Liga de Gamificação (XP).
- Lista de "Atenção Imediata": Leads sem primeiro contato e faturas vencendo hoje.

### 3.3 Aba 2: Leads & Funil Mobile (`(tabs)/leads.tsx`)
- Seletor horizontal de etapas do funil (`Aguardando Atendimento`, `Em Atendimento`, `Visita Agendada`, `Proposta`, `Fechado`).
- Busca instantânea por nome ou telefone.
- Card do Lead otimizado para o polegar:
  - Nome, origem (`Meta Ads`, `Site`, `Indicação`), imóvel de interesse e tempo na etapa.
  - Botão verde **Chamar no WhatsApp** (abre o app do WhatsApp já com a mensagem personalizada).
  - Modal rápido para mudar etapa do funil e adicionar nota na `timeline_events`.

### 3.4 Aba 3: Imóveis & Captação na Rua (`(tabs)/properties.tsx`)
- Listagem dos imóveis da imobiliária (`properties`) com foto de capa, código, bairro, preço de venda/aluguel e badge de status (`Disponível`, `Alugado`, `Vendido`).
- Filtros rápidos: `[Todos | Venda | Locação | Meus Imóveis]`.
- Botão **"Compartilhar no WhatsApp"** (envia o link público do imóvel com prévia para o cliente).
- Modal de **Detalhe e Cadastro Rápido de Imóvel** (permitindo subir fotos tiradas na hora pela câmera).

### 3.5 Aba 4: Financeiro Nubank / Minhas Comissões (`(tabs)/finance.tsx`)
- **Isolamento estrito por Role (mesma regra do SDD Web):**
  - Se `role === 'corretor'` associado: Renderiza exclusivamente **Minhas Comissões** (Recebido no Mês, Liberado a Receber, Bloqueado aguardando cliente e Chave PIX).
  - Se `owner` / `manager` / `solo_broker`: Renderiza o **Caixa Inteligente Mobile**:
    - Hero Card com Saldo Líquido do Mês (protegido opcionalmente por FaceID/Biometria).
    - Sub-abas rápidas: `Resumo`, `Locações Ativas`, `A Receber` (com botão de copiar PIX Copia e Cola ou mandar cobrança no WhatsApp), `Repasses` e `A Pagar`.

### 3.6 Aba 5: Configurações & Perfil (`(tabs)/settings.tsx`)
- Edição de Perfil (Nome, Telefone, CRECI, CPF/CNPJ).
- **Minha Chave PIX e Dados Bancários** (`profiles.pix_key` e `profiles.bank_info`).
- **Assinatura Digital na Tela** (desenhar rubrica com o dedo para os contratos PDF).
- Preferências do App: Alternador de Tema (`Claro` / `Escuro` / `Sistema`), Biometria/FaceID e botão Sair.