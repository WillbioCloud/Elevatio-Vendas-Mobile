# SDD v3 (System Design Document) & Plano de Ação — Elevatio Vendas Mobile (Polimento Crítico, Assinatura Inteligente, Contratos A4 e Gestão de Equipe/Permissões)

> **INSTRUÇÕES INEGOCIÁVEIS PARA O AGENTE DO ANTIGRAVITY:**
> 1. **PROIBIÇÃO ABSOLUTA DE DDL NO SUPABASE (MCP / SQL):** Você está **terminantemente proibido** de executar comandos `ALTER`, `DROP`, `CREATE`, `TRUNCATE` ou qualquer migração no banco de dados Supabase (`udqychpxnbdaxlorbhyw`). O banco de dados é compartilhado em tempo real com a aplicação Web em produção. Use apenas os nomes exatos de tabelas e colunas já existentes.
> 2. **EXECUÇÃO COMPLETA EM LOTE:** Implemente todos os 4 Pilares abaixo de uma só vez, garantindo compilação TypeScript limpa (`npx tsc --noEmit`) e zero placeholders.

---

## 1. Diagnóstico & Correção Imediata: Bug HTTP 400 em Imóveis + Cadastro Completo de Imóveis

### 1.1 Causa Raiz do Erro `400 Bad Request` (Cards de Imóveis Sumiram)
A requisição `GET /rest/v1/properties?select=...,condo_fee,iptu_fee` falhou com `HTTP 400` porque as colunas **`condo_fee`** e **`iptu_fee` NÃO existem** na tabela `public.properties` do Supabase.
No schema real de produção (`public.properties`), os nomes corretos das colunas são:
- **`condominium`** (`numeric`, default `0`) — Valor do condomínio
- **`iptu`** (`numeric`, default `0`) — Valor do IPTU

### 1.2 Correção Obrigatória na Listagem (`src/app/(tabs)/properties.tsx` e `src/types/index.ts`)
1. Em `src/types/index.ts`, atualize a interface `Property`:
   ```ts
   export interface Property {
     id: string;
     company_id: string;
     agent_id?: string | null;
     created_by?: string | null;
     code?: string | null;
     title: string;
     slug?: string | null;
     description?: string | null;
     price: number;
     condominium?: number | null; // NUNCA usar condo_fee
     iptu?: number | null;        // NUNCA usar iptu_fee
     type: string;
     listing_type?: 'sale' | 'rent' | 'seasonal' | string;
     status: 'Disponível' | 'Reservado' | 'Vendido' | 'Alugado' | 'Inativo' | string;
     bedrooms: number;
     suites?: number | null;
     bathrooms: number;
     garage: number;
     area: number;
     built_area?: number | null;
     land_area?: number | null;
     cep?: string | null;
     street?: string | null;
     number?: string | null;
     complement?: string | null;
     neighborhood?: string | null;
     city?: string | null;
     state?: string | null;
     features?: string[] | null;
     images: string[];
     video_url?: string | null;
     tour_360_url?: string | null;
     featured?: boolean;
     is_seasonal?: boolean;
     daily_rate?: number | null;
     cleaning_fee?: number | null;
     max_guests?: number | null;
     min_nights?: number | null;
     owner_name?: string | null;
     owner_cpf_cnpj?: string | null;
     owner_phone?: string | null;
     owner_email?: string | null;
     owner_pix?: string | null;
     has_exclusivity?: boolean;
     commission_agreed?: string | null;
     has_intermediation_signed?: boolean;
     intermediation_contract_url?: string | null;
     key_location?: string | null;
     key_status?: 'available' | 'borrowed' | string | null;
     created_at?: string;
     updated_at?: string;
   }
   ```
2. Em `src/app/(tabs)/properties.tsx`, substitua imediatamente a query do Supabase por:
   ```ts
   const { data, error } = await supabase
     .from('properties')
     .select('id, code, title, slug, price, condominium, iptu, type, listing_type, status, city, neighborhood, state, bedrooms, suites, bathrooms, area, garage, images, featured, has_intermediation_signed, created_at, agent_id, created_by, owner_name, owner_phone, key_status, key_location')
     .eq('company_id', profile.company_id)
     .order('created_at', { ascending: false });
   ```
3. Nos cards de imóvel e modais de detalhes, renderize `property.condominium` e `property.iptu`.

### 1.3 Poder Total de Criação e Edição de Imóveis (`src/app/property-form/index.tsx`)
Garanta que o formulário mobile (`src/app/property-form/index.tsx`) suporte **Criação** e **Edição** (`?id=...`) com paridade total com `AdminPropertyForm.tsx` da Web:
- **Etapa 1 (Negócio & Valores):**
  - Seletor de Modalidade (`listing_type`: `'sale'` Venda, `'rent'` Locação, `'seasonal'` Temporada; se `'seasonal'`, setar `is_seasonal = true` e exibir `daily_rate`, `cleaning_fee`, `max_guests`, `min_nights`).
  - Tipo de Imóvel (`type`: Apartamento, Casa, Casa em Condomínio, Cobertura, Terreno, Comercial, Rural/Chácara, Studio/Flat).
  - Status (`status`: `'Disponível'`, `'Reservado'`, `'Vendido'`, `'Alugado'`, `'Inativo'`).
  - Título (`title`), Descrição Completa (`description`), Preço Principal (`price`), Condomínio (`condominium`) e IPTU (`iptu`).
- **Etapa 2 (Endereço & Características):**
  - Busca automática por CEP (`https://viacep.com.br/ws/${cep}/json/`) preenchendo `street`, `neighborhood`, `city`, `state`, além de `number` e `complement`.
  - Cômodos e Áreas: `bedrooms`, `suites`, `bathrooms`, `garage`, `area` (Área Útil m²), `built_area` (Área Construída m²), `land_area` (Área do Terreno m²).
  - Seletor de Comodidades (`features`: Piscina, Churrasqueira, Academia, Portaria 24h, Elevador, Varanda Gourmet, Mobiliado, Aceita Pet, Energia Solar, etc.).
  - Controle de Chaves: `key_location` (ex: Quadro 01 - Gancho 12, Portaria, Com Proprietário) e `key_status` (`'available'`).
- **Etapa 3 (Proprietário & Jurídico — Dados Confidenciais):**
  - `owner_name`, `owner_cpf_cnpj`, `owner_phone`, `owner_email`, `owner_pix`, `commission_agreed` (ex: `6%` ou `10%`), `has_exclusivity` (Switch), `has_intermediation_signed` (Switch).
- **Etapa 4 (Fotos & Mídia com Câmera e Galeria):**
  - Captura direta pela câmera (`ImagePicker.launchCameraAsync`) ou seleção múltipla da galeria (`ImagePicker.launchImageLibraryAsync`).
  - Upload para o bucket `properties` no Supabase Storage (`${company_id}/${Date.now()}_${index}.jpg`), salvando as URLs públicas no array `images: string[]`.
  - Reordenação de foto de capa (definir como capa movendo para o índice `0`) e exclusão de fotos.
  - Payload de `insert` / `update` enviando `company_id: profile.company_id`, `agent_id: profile.id`, `created_by: profile.id`, `condominium` e `iptu` (jamais `condo_fee` ou `iptu_fee`).

---

## 2. Pad de Assinatura Avançado & Scanner Inteligente por Câmera (`src/app/signature/index.tsx` e `settings.tsx`)

O módulo de assinatura digital (acessado tanto em **Configurações > Minha Assinatura / Assinatura da Imobiliária** quanto no fluxo de **Assinar Contrato**) deve espelhar a engenharia de `SignDocument.tsx` e `AdminConfig.tsx` da Web, resolvendo todos os bugs de usabilidade mobile:

### 2.1 Carregamento da Assinatura Salva no Topo
- Ao abrir a tela/modal de assinatura (`src/app/signature/index.tsx` ou seção em `settings.tsx`), busque imediatamente a assinatura atual no banco:
  - Assinatura pessoal do corretor/usuário: `profile.signature_url` (coluna `signature_url` em `public.profiles`).
  - Assinatura institucional da imobiliária (se `isOwner || isManager`): `company.admin_signature_url` (coluna `admin_signature_url` em `public.companies`).
- Caso já exista uma assinatura salva, exiba um **Card de Assinatura Atual** no topo com fundo quadriculado claro (`#ffffff` com borda `#e4e4e7`), mostrando a imagem `<Image source={{ uri: savedSignatureUrl }} resizeMode="contain" className="w-full h-24" />`, um selo `"Assinatura Ativa"` e botões para `"Substituir / Criar Nova"` ou `"Remover"`.

### 2.2 Aba 1: Desenhar a Mão Livre (`Draw`) — Trava de Scroll, Múltiplos Traços e Desfazer/Refazer (`Undo` / `Redo`)
1. **Conflito de Scroll Resolvido (`scrollEnabled`):**
   - O `ScrollView` pai da tela deve controlar `const [isScrollEnabled, setIsScrollEnabled] = useState(true)`.
   - Quando o dedo tocar no Canvas de assinatura (`onTouchStart` / `onPanResponderGrant`), execute imediatamente `setIsScrollEnabled(false)`.
   - Quando o dedo soltar o Canvas (`onTouchEnd` / `onTouchCancel` / `onPanResponderRelease`), execute `setIsScrollEnabled(true)`. Assim a página **nunca rola** enquanto o usuário está desenhando!
2. **Persistência de Múltiplos Traços (Nunca apagar ao tocar novamente):**
   - Mantenha dois estados separados:
     ```ts
     const [strokes, setStrokes] = useState<string[]>([]);       // Lista de paths SVG já finalizados
     const [redoStack, setRedoStack] = useState<string[]>([]);   // Pilha para Refazer
     const [currentPath, setCurrentPath] = useState<string>(''); // Traço sendo desenhado agora
     ```
   - Ao iniciar um novo toque (`onGrant`), **NÃO limpe `strokes`**! Apenas inicie `setCurrentPath(\`M \${x} \${y}\`)`.
   - Ao mover o dedo (`onMove`), concatene `L ${x} ${y}` em `currentPath`.
   - Ao soltar o dedo (`onRelease`), adicione `currentPath` ao array `strokes` (`setStrokes(prev => [...prev, currentPath])`), limpe `setCurrentPath('')` e zere `setRedoStack([])`.
   - Dessa forma, o usuário pode assinar letra por letra, colocar pingos no "i", acentos e sobrenome sem perder o traço anterior.
3. **Botões Desfazer (`Undo`), Refazer (`Redo`) e Limpar (`Clear`):**
   - **Desfazer (`Undo2`):** Remove o último traço de `strokes` e o empilha em `redoStack`:
     ```ts
     const handleUndo = () => {
       if (strokes.length === 0) return;
       const last = strokes[strokes.length - 1];
       setStrokes(prev => prev.slice(0, -1));
       setRedoStack(prev => [...prev, last]);
     };
     ```
   - **Refazer (`Redo2`):** Restaura o último traço de `redoStack` para `strokes`:
     ```ts
     const handleRedo = () => {
       if (redoStack.length === 0) return;
       const next = redoStack[redoStack.length - 1];
       setRedoStack(prev => prev.slice(0, -1));
       setStrokes(prev => [...prev, next]);
     };
     ```
   - **Limpar (`Eraser` / `Trash2`):** É o **único** lugar que zera todos os traços (`setStrokes([]); setRedoStack([]); setCurrentPath('');`).

### 2.3 Aba 2: Assinatura Cursiva Digitada (`Type`) — As 5 Fontes Oficiais da Web
Idêntico ao `FONT_OPTIONS` do `SignDocument.tsx` da Web, ofereça o input de texto com o nome do signatário e os **5 estilos de fonte selecionáveis em cards**:
1. **Clássica:** `'Dancing Script'` (`@expo-google-fonts/dancing-script` ou Google Fonts via WebView Canvas)
2. **Manuscrita:** `'Chilanka'`
3. **Elegante:** `'Grand Hotel'`
4. **Moderna:** `'Inter'` (Itálico Semibold)
5. **Fluida:** `'Satisfy'`

- Para garantir fidelidade 100% na exportação para PNG transparente (idêntico à Web sem depender de pacotes nativos extras de fonte se não instalados), renderize o preview e a exportação `toDataURL('image/png')` usando um mini Canvas HTML5 invisível/visível via `react-native-webview` que importa `<link href="https://fonts.googleapis.com/css2?family=Chilanka&family=Dancing+Script:wght@600;700&family=Grand+Hotel&family=Inter:ital,wght@1,600&family=Satisfy&display=swap" rel="stylesheet">` e desenha a assinatura em `#0f172a` sobre fundo transparente!

### 2.4 Aba 3: Scanner Inteligente de Assinatura por Câmera em Tempo Real (`Camera Scan`)
Implemente o fluxo de **Digitalização Inteligente de Assinatura** (portando o algoritmo `processSmartSignature` de `SignDocument.tsx`):
1. **Captura Guiada:**
   - O usuário clica em **"Escanear Assinatura com a Câmera"** (ou escolher foto da galeria).
   - Se usar `expo-camera` (`CameraView`) em um modal fullscreen (ou captura direta com `launchCameraAsync`), exiba o guia visual: *"Assine em um papel branco com caneta escura (azul ou preta) e centralize a assinatura no quadro"*.
2. **Processamento Inteligente Automático (`processSmartSignature` via Canvas Offscreen no WebView):**
   - Assim que a foto é capturada (em base64), passe a imagem para a função `processSmartSignature(base64Image)` executada em um `<canvas>` HTML5 dentro do WebView de processamento:
     - Redimensiona para largura máxima de `800px`.
     - Percorre todos os pixels (`ctx.getImageData`):
       - Calcula a luminância: `brightness = (r * 0.299) + (g * 0.587) + (b * 0.114)`.
       - Se `brightness < 120` (tinta da caneta): converte para azul-marinho documental profundo (`r = 15, g = 23, b = 42, a = 255`) e registra `minX, minY, maxX, maxY`.
       - Se `brightness >= 120` (papel branco/sombra clara): remove completamente o fundo (`a = 0`, 100% transparente).
     - Faz o **Auto-Crop (Recorte Automático)** na caixa delimitadora (`minX - 20`, `minY - 20`, `maxX + 20`, `maxY + 20`) e retorna o `croppedCanvas.toDataURL('image/png')`.
3. **Resultado Imediato:**
   - Sem exigir que o usuário recorte manualmente na mão, exiba imediatamente a assinatura já recortada e com fundo transparente no preview, pronta para clicar em **"Salvar Assinatura"**.

---

## 3. Central de Contratos: Tag do Corretor, Documento Formatado A4 (PDF Preview) e Dupla Opção de Assinatura

### 3.1 Tag do Corretor Responsável no Card de Contrato (`src/app/contracts/index.tsx`)
- Na query de listagem de contratos (`public.contracts`), faça o join ou mapeie o corretor responsável (`broker_id` / `created_by` cruzado com `profiles` da empresa):
  ```ts
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*, properties(title, code), leads(name, phone), broker:profiles!contracts_broker_id_fkey(id, name, avatar_url)')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false });
  ```
  *(Nota: Se a FK `contracts_broker_id_fkey` não existir com esse nome exato no PostgREST, busque os `profiles` da `company_id` em paralelo e faça o lookup `profilesMap[contract.broker_id || contract.created_by]` no cliente para **nunca** causar erro HTTP 400!)*
- Em cada Card de Contrato na lista (`src/app/contracts/index.tsx`), exiba uma **Tag / Badge do Corretor** clara e elegante:
  - Ícone `UserCheck` ou mini avatar + texto: **`Corretor: {brokerName}`** (ex: `Corretor: João Silva`).

### 3.2 Visualização do Contrato em Formato de Documento Final / Folha A4 (`ContractReviewModal.tsx`)
- **PROIBIDO exibir código HTML cru ou tags soltas (`<p>`, `<div>`, `{{ASSINATURA_...}}`) para o usuário!** Quem revisa e assina o contrato é o dono da imobiliária, o corretor ou o cliente final, não um programador.
- No `ContractReviewModal.tsx`, renderize o contrato dentro de um **`WebView` estilizado como Folha A4 real** (portando a função `buildContractPreviewHtml` de `SignDocument.tsx`):
  - Substitua todas as tags `{{ASSINATURA_LOCADOR}}`, `{{ASSINATURA_LOCATARIO}}`, `{{ASSINATURA_VENDEDOR}}`, `{{ASSINATURA_COMPRADOR}}`, `{{ASSINATURA_CORRETOR}}`, `{{ASSINATURA_TESTEMUNHA_1}}`, `{{ASSINATURA_TESTEMUNHA_2}}` por blocos visuais de assinatura contendo a imagem da assinatura (`<img src="..." />` se já assinado) ou a linha tracejada elegante com o nome e papel do signatário.
  - Caso o contrato possua `signatures` salvas (ou `contract_data.signatures_positions`), injete os carimbos visuais com a imagem da assinatura, data/hora e selo `"ASSINADO DIGITALMENTE — ELEVATIO SIGN"`.
  - Aplique CSS de página A4 branca (`background: #ffffff; color: #0f172a; font-family: 'Georgia', 'Times New Roman', serif; padding: 28px; line-height: 1.6; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08)`), permitindo zoom e leitura fluida como um PDF oficial.
  - Adicione também um botão **"Compartilhar / Baixar PDF"** no topo do modal usando `expo-print` (`Print.printToFileAsync({ html })`) + `expo-sharing` (`Sharing.shareAsync(uri)`) para gerar e enviar o PDF real do contrato no WhatsApp em 1 toque.

### 3.3 Fluxo de Assinatura com 2 Opções Explícitas ("Usar Assinatura Existente" vs "Assinar Agora")
Quando o usuário (dono revisando/aprovando ou corretor assinando) clicar em **"Assinar Contrato Agora"** dentro do `ContractReviewModal.tsx`:
1. Abra um **ActionSheet / Modal de Escolha de Assinatura** com duas opções claras:
   - **Opção 1: "Usar assinatura existente"**
     - Exibe uma miniatura da assinatura já salva no perfil (`profile.signature_url` ou `company.admin_signature_url`).
     - Se clicado, aplica imediatamente essa assinatura ao contrato (atualizando `contract_signatures` / `contract_data` e status do contrato) com feedback instantâneo de sucesso, sem precisar desenhar de novo!
     - *(Se o usuário ainda não tiver nenhuma assinatura salva no perfil, mostre um aviso sutil "Nenhuma assinatura salva no perfil" e direcione para a Opção 2).*
   - **Opção 2: "Assinar agora (Criar nova)"**
     - Abre o Pad de Assinatura (`src/app/signature/index.tsx` ou modal embutido com Desenhar / Digitar 5 Fontes / Escanear com Câmera) para coletar uma assinatura nova na hora, aplicando-a ao contrato e perguntando se também deseja salvá-la como padrão no perfil.

---

## 4. Novas Abas em Configurações para Imobiliárias: `Equipe` e `Permissões` (`src/app/(tabs)/settings.tsx`)

Quando a conta logada for uma **Imobiliária** (`company?.business_type !== 'solo_broker'`) e o usuário tiver perfil de gestão (`profile.role === 'owner' || profile.role === 'super_admin' || profile.role === 'manager' || profile.role === 'admin'`), a tela de **Configurações (`src/app/(tabs)/settings.tsx`)** deve exibir uma barra de navegação segmentada no topo (ou cards de acesso dedicados) contendo as novas seções **Equipe** e **Permissões**, espelhando 100% `TeamSettings.tsx` e `PermissionsSettings.tsx` da Web:

### 4.1 Aba `Equipe` (`src/components/settings/TeamSettingsTab.tsx`)
1. **Sub-abas Internas:**
   - **Membros Ativos (`active`):** Usuários da `company_id` com `status === 'active'`.
   - **Pendentes de Aprovação (`pending`):** Usuários com `status === 'pending'` ou `'paused'`, com badge contador vermelho/âmbar.
2. **Ação "Convidar Usuário":**
   - Modal para escolher o cargo do convite (`agent` Corretor, `attendant` Atendente, `admin` Administrativo, `manager` Gerente) e gerar o link oficial de convite:
     ```ts
     const token = btoa(JSON.stringify({ c: profile.company_id, r: inviteRole }));
     const url = `https://elevatiovendas.com.br/convite?token=${token}`;
     ```
   - Botões para **Copiar Link** (`expo-clipboard`) e **Enviar no WhatsApp** (`Linking.openURL`).
3. **Cards de Membros da Equipe:**
   - Exibe Avatar (`avatar_url` ou iniciais), Nome, E-mail, Telefone/WhatsApp, Badge de Cargo (`Dono`, `Gerente`, `Administrativo`, `Atendente`, `Corretor`) e Indicador de Presença (`last_seen`: Online agora `< 5 min`, Visto há X min/h/d).
   - **Ações Rápidas por Membro:**
     - Alterar Cargo (`role` em `public.profiles`).
     - Aprovar (`status = 'active'`) ou Pausar acesso (`status = 'paused'`).
     - Remover membro (`DELETE` em `public.profiles` com confirmação).
     - Botão **"Permissões Individuais"** (ícone `Shield`): abre o Modal de Permissões Individuais daquele usuário.
4. **Modal de Permissões Individuais por Usuário:**
   - Exibe os **5 Grupos Expansíveis (Accordions)** idênticos ao `TeamSettings.tsx`:
     1. **Gestão de Imóveis:** `properties_view_all`, `properties_create`, `properties_edit`, `properties_delete`
     2. **Controle de Chaves:** `keys_view`, `keys_manage`
     3. **Contratos Jurídicos:** `contracts_view_all`, `contracts_create`, `contracts_delete`
     4. **Gestão de Leads:** `leads_view_team`, `leads_redistribute`, `leads_delete`, `export_leads`
     5. **Painel Financeiro:** `finance_view`, `finance_view_global`
   - Mostra se cada permissão vem do **Padrão do Cargo** ou se foi **Personalizada** para aquele corretor, permitindo alternar switches individuais, **"Restaurar Padrão do Cargo"** e salvar em `profiles.permissions` (`supabase.from('profiles').update({ permissions: customPerms }).eq('id', member.id)`).

### 4.2 Aba `Permissões` (`src/components/settings/PermissionsSettingsTab.tsx`)
Espelha `PermissionsSettings.tsx` da Web para configurar a matriz global de cargos da imobiliária:
1. **Seletor de Cargo no Topo (Pills Horizontais):**
   - `Gerente` (`manager`)
   - `Administrativo` (`admin`)
   - `Atendente` (`attendant`)
   - `Corretor` (`agent`)
2. **Lista de Permissões por Categoria do Cargo Selecionado:**
   - Renderiza os switches das 15 permissões (`properties_view_all`, `properties_create`, `properties_edit`, `properties_delete`, `keys_view`, `keys_manage`, `contracts_view_all`, `contracts_create`, `contracts_delete`, `leads_view_team`, `leads_redistribute`, `leads_delete`, `export_leads`, `finance_view`, `finance_view_global`) para o cargo selecionado.
3. **Persistência Real na Tabela `public.settings`:**
   - Carrega `settings` onde `company_id = profile.company_id` e `key = 'permissions'`.
   - Ao clicar em **"Salvar Padrões de Cargo"**, faz `update` (ou `insert` se não existir) em `public.settings` salvando `{ role_permissions: rolePerms }` no campo JSONB `value`, exatamente como `PermissionsSettings.tsx` faz na Web.

---

## 5. Checklist de Verificação Final (Quality Gate)
- [ ] **Zero erro HTTP 400 em `properties`:** Nenhuma referência a `condo_fee` ou `iptu_fee` resta no projeto; todas usam `condominium` e `iptu`.
- [ ] **Cadastro e Edição de Imóveis 100% funcional:** 4 etapas completas com ViaCEP, dados do proprietário, câmera/galeria e upload no Supabase Storage.
- [ ] **Assinatura Digital Perfeita:** Assinatura salva aparece no topo; desenhar no pad bloqueia o scroll vertical da tela; múltiplos traços permanecem no canvas até clicar em `"Limpar"`; botões `"Desfazer"` e `"Refazer"` funcionam por traço; 5 fontes cursivas disponíveis; Scanner de Câmera remove o fundo branco e recorta automaticamente (`processSmartSignature`).
- [ ] **Contratos Formatados + Tag do Corretor + 2 Opções ao Assinar:** Tag do corretor visível nos cards; contrato renderizado como folha A4 limpa (sem HTML/tags cruas); botão de assinar pergunta entre `"Usar assinatura existente"` e `"Assinar agora"`.
- [ ] **Abas Equipe e Permissões em Configurações:** Funcionando para imobiliárias com convite de membros, aprovação, permissões individuais por usuário e matriz de permissões por cargo.
