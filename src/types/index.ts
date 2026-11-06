export type UserRole = 'owner' | 'manager' | 'admin' | 'atendente' | 'corretor';
export type AppUserRole = UserRole | 'super_admin';

export interface RolePermissionsMap {
  [permissionKey: string]: boolean;
}

export interface AppRolePermissions {
  manager?: RolePermissionsMap;
  admin?: RolePermissionsMap;
  attendant?: RolePermissionsMap;
  agent?: RolePermissionsMap;
  [role: string]: RolePermissionsMap | undefined;
}

export interface Company {
  id: string;
  name: string;
  subdomain?: string | null;
  domain?: string | null;
  plan: string;
  plan_status?: string | null;
  business_type?: 'agency' | 'solo_broker' | string | null;
  logo_url?: string | null;
  admin_signature_url?: string | null;
  default_commission?: number | null;
  broker_commission?: number | null;
  phone?: string | null;
  email?: string | null;
  finance_config?: any;
}

export interface Profile {
  id: string;
  company_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: AppUserRole;
  creci?: string | null;
  document?: string | null;
  cpf_cnpj?: string | null;
  avatar_url?: string | null;
  signature_url?: string | null;
  pix_key?: string | null;
  pix_type?: string | null;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;
  bank_info?: any;
  permissions?: any;
  last_seen?: string | null;
  level: number;
  level_title: string;
  xp_points: number;
  active: boolean;
}

export interface AppSettings {
  id: number;
  company_id?: string | null;
  route_to_central?: boolean;
  central_user_id?: string | null;
  central_whatsapp?: string | null;
  kanban_config?: any;
  permissions?: any;
}

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
  zip_code?: string | null;
  address?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  features?: string[] | null;
  amenities?: string[] | null;
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
  owner_pix_key?: string | null;
  owner_pix_type?: string | null;
  owner_civil_status?: string | null;
  has_exclusivity?: boolean;
  commission_agreed?: string | null;
  commission_percentage?: number | null;
  has_intermediation_signed?: boolean;
  intermediation_contract_url?: string | null;
  key_location?: string | null;
  key_status?: 'agency' | 'client' | 'broker' | 'owner' | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Lead {
  id: string;
  company_id?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  funnel_step?: string | null;
  source?: string | null;
  budget?: number | null;
  value?: number | null;
  deal_value?: number | null;
  sold_property_id?: string | null;
  loss_reason?: string | null;
  last_interaction?: string | null;
  stage_updated_at?: string | null;
  updated_at?: string | null;
  assigned_to?: string | null;
  created_at: string;
  message?: string | null;
  notes?: string | null;
  property_title?: string | null;
  desired_type?: string | null;
  desired_bedrooms?: number | null;
  desired_location?: string | null;
  interested_properties?: string[] | null;
  navigation_data?: any;
  lead_score?: number | null;
  property_id?: string | null;
  properties?: {
    id: string;
    title: string;
    price?: number | null;
    city?: string | null;
    neighborhood?: string | null;
    bedrooms?: number | null;
    type?: string | null;
  } | null;
  assigned_profile?: {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
  assigned_user?: {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
}

export interface LeadMatch {
  id: string;
  lead_id: string;
  property_id: string;
  match_score?: number;
  match_reason?: string | null;
}

export interface TimelineEvent {
  id: string;
  created_at: string;
  title?: string;
  type: 'status_change' | 'note' | 'call_log' | 'whatsapp' | string;
  description: string;
  metadata?: any;
  lead_id: string;
  created_by?: string | null;
  company_id?: string | null;
  creator?: {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface Task {
  id: string;
  created_at: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  completed: boolean;
  type?: string | null;
  lead_id?: string | null;
  user_id?: string | null;
  status?: string | null;
  priority?: string | null;
  company_id?: string | null;
}

export interface ContractSignature {
  id: string;
  contract_id: string;
  company_id?: string | null;
  signer_name: string;
  signer_email?: string | null;
  signer_phone?: string | null;
  signer_document?: string | null;
  signer_role: string;
  token?: string | null;
  status: 'pending' | 'signed' | 'refused' | string;
  signed_at?: string | null;
  signature_image?: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  lead_id?: string | null;
  property_id?: string | null;
  broker_id?: string | null;
  company_id?: string | null;
  type: 'venda' | 'locacao' | 'intermediacao' | 'administracao' | string;
  status: 'draft' | 'pending' | 'active' | 'signed' | 'canceled' | string;
  start_date?: string | null;
  end_date?: string | null;
  sale_total_value?: number | null;
  sale_down_payment?: number | null;
  rent_value?: number | null;
  condo_value?: number | null;
  iptu_value?: number | null;
  commission_total?: number | null;
  notes?: string | null;
  content?: string | null;
  html_content?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
  property?: {
    id: string;
    title: string;
    price?: number | null;
    city?: string | null;
    neighborhood?: string | null;
  } | null;
  lead?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    cpf_cnpj?: string | null;
  } | null;
  broker?: {
    id: string;
    name: string;
    avatar_url?: string | null;
    creci?: string | null;
  } | null;
  signatures?: ContractSignature[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  company_id?: string | null;
  title: string;
  message: string;
  content?: string | null;
  type: string;
  category?: 'system' | 'team' | 'leads' | 'contracts' | string | null;
  read: boolean;
  link?: string | null;
  created_at: string;
}

export interface AgentCommission {
  id: string;
  company_id: string;
  agent_id: string;
  amount: number;
  commission_rate: number;
  description: string;
  due_date: string;
  status: 'pending' | 'paid' | 'bloqueado' | string;
  property_value?: number | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  client_name: string;
  description?: string | null;
  amount: number;
  due_date: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado' | string;
  transaction_type?: string | null;
  owner_net_value?: number | null;
  broker_commission_value?: number | null;
  created_at: string;
}

export interface OperatingExpense {
  id: string;
  company_id: string;
  description: string;
  amount: number;
  due_date: string;
  category: string;
  status: 'pending' | 'paid' | string;
  created_at: string;
}
