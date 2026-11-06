export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  title: string;
  icon: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'properties',
    title: 'Gestão de Imóveis',
    icon: 'Building2',
    permissions: [
      { key: 'properties_view_all', label: 'Ver todos os imóveis', description: 'Visualizar imóveis de todos os corretores da empresa' },
      { key: 'properties_create', label: 'Cadastrar novos imóveis', description: 'Permissão para criar novos cadastros no catálogo' },
      { key: 'properties_edit', label: 'Editar qualquer imóvel', description: 'Editar fotos, valores e dados mesmo não sendo o captador' },
      { key: 'properties_delete', label: 'Excluir imóveis', description: 'Remover imóveis do sistema permanentemente' },
    ],
  },
  {
    id: 'keys',
    title: 'Controle de Chaves',
    icon: 'Key',
    permissions: [
      { key: 'keys_view', label: 'Visualizar chaves e localização', description: 'Ver onde estão as chaves físicas e claviculário' },
      { key: 'keys_manage', label: 'Gerenciar retiradas e devoluções', description: 'Registrar saída para visitas e retorno de chaves' },
    ],
  },
  {
    id: 'contracts',
    title: 'Contratos Jurídicos',
    icon: 'FileText',
    permissions: [
      { key: 'contracts_view_all', label: 'Visualizar todos os contratos', description: 'Acessar minutas e contratos de toda a imobiliária' },
      { key: 'contracts_create', label: 'Criar e enviar novos contratos', description: 'Gerar contratos de venda, locação ou intermediação' },
      { key: 'contracts_delete', label: 'Excluir minutas e contratos', description: 'Remover contratos e minutas arquivadas' },
    ],
  },
  {
    id: 'leads',
    title: 'Gestão de Leads',
    icon: 'Users',
    permissions: [
      { key: 'leads_view_team', label: 'Visualizar leads da equipe', description: 'Acessar contatos e atendimentos de outros corretores' },
      { key: 'leads_redistribute', label: 'Redistribuir leads', description: 'Trocar o corretor responsável por um lead' },
      { key: 'leads_delete', label: 'Excluir leads e contatos', description: 'Apagar leads descartados do CRM' },
      { key: 'export_leads', label: 'Exportar base de leads', description: 'Exportar listas e relatórios de clientes' },
    ],
  },
  {
    id: 'finance',
    title: 'Painel Financeiro',
    icon: 'DollarSign',
    permissions: [
      { key: 'finance_view', label: 'Visualizar financeiro pessoal', description: 'Acompanhar próprias comissões e repasses' },
      { key: 'finance_view_global', label: 'Visualizar financeiro global', description: 'Ver faturamento, despesas e DRE da imobiliária' },
    ],
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  manager: {
    properties_view_all: true,
    properties_create: true,
    properties_edit: true,
    properties_delete: true,
    keys_view: true,
    keys_manage: true,
    contracts_view_all: true,
    contracts_create: true,
    contracts_delete: true,
    leads_view_team: true,
    leads_redistribute: true,
    leads_delete: true,
    export_leads: true,
    finance_view: true,
    finance_view_global: true,
  },
  admin: {
    properties_view_all: true,
    properties_create: true,
    properties_edit: true,
    properties_delete: true,
    keys_view: true,
    keys_manage: true,
    contracts_view_all: true,
    contracts_create: true,
    contracts_delete: true,
    leads_view_team: true,
    leads_redistribute: true,
    leads_delete: true,
    export_leads: true,
    finance_view: true,
    finance_view_global: true,
  },
  attendant: {
    properties_view_all: true,
    properties_create: true,
    properties_edit: true,
    properties_delete: true,
    keys_view: true,
    keys_manage: true,
    contracts_view_all: false,
    contracts_create: false,
    contracts_delete: false,
    leads_view_team: true,
    leads_redistribute: true,
    leads_delete: true,
    export_leads: false,
    finance_view: false,
    finance_view_global: false,
  },
  agent: {
    properties_view_all: false,
    properties_create: true,
    properties_edit: false,
    properties_delete: false,
    keys_view: true,
    keys_manage: false,
    contracts_view_all: false,
    contracts_create: true,
    contracts_delete: false,
    leads_view_team: false,
    leads_redistribute: false,
    leads_delete: false,
    export_leads: false,
    finance_view: true,
    finance_view_global: false,
  },
};

export const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  owner: { label: 'Dono', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
  super_admin: { label: 'Super Admin', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
  manager: { label: 'Gerente', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  admin: { label: 'Administrativo', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  attendant: { label: 'Atendente', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  atendente: { label: 'Atendente', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  agent: { label: 'Corretor', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  corretor: { label: 'Corretor', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  solo_broker: { label: 'Corretor Autônomo', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
};

export function encodeBase64(str: string): string {
  try {
    if (typeof btoa === 'function') {
      return btoa(str);
    }
  } catch (e) {}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (
    let block = 0, charCode, idx = 0, map = chars;
    str.charAt(idx | 0) || ((map = '='), idx % 1);
    output += map.charAt(63 & (block >> (8 - (idx % 1) * 8)))
  ) {
    charCode = str.charCodeAt((idx += 3 / 4));
    if (charCode > 0xff) {
      throw new Error(
        "'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."
      );
    }
    block = (block << 8) | charCode;
  }
  return output;
}

export function formatLastSeen(lastSeenDate?: string | null): { text: string; isOnline: boolean } {
  if (!lastSeenDate) return { text: 'Nunca acessou', isOnline: false };
  const diffMs = Date.now() - new Date(lastSeenDate).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 5) return { text: 'Online agora', isOnline: true };
  if (diffMin < 60) return { text: `Visto há ${diffMin} min`, isOnline: false };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `Visto há ${diffHours}h`, isOnline: false };
  const diffDays = Math.floor(diffHours / 24);
  return { text: `Visto há ${diffDays}d`, isOnline: false };
}

