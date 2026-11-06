export type UserRole = 'owner' | 'manager' | 'admin' | 'atendente' | 'corretor';
export type AppUserRole = UserRole | 'super_admin';

export interface Company {
  id: string;
  name: string;
  subdomain?: string | null;
  domain?: string | null;
  plan: string;
  plan_status?: string | null;
  business_type?: 'agency' | 'solo_broker' | null;
  logo_url?: string | null;
  default_commission?: number | null;
  broker_commission?: number | null;
  phone?: string | null;
  email?: string | null;
}

export interface Profile {
  id: string;
  company_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: AppUserRole;
  creci?: string | null;
  avatar_url?: string | null;
  level: number;
  level_title: string;
  xp_points: number;
  active: boolean;
  pix_key?: string | null;
}

export interface Property {
  id: string;
  title: string;
  slug: string;
  price: number;
  type: string;
  listing_type?: 'sale' | 'rent' | 'temporada' | string;
  status: string;
  city: string;
  neighborhood: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  garage: number;
  images?: string[];
  featured?: boolean;
  created_at?: string;
  agent_id?: string | null;
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
  assigned_to?: string | null;
  created_at: string;
  message?: string | null;
  property_id?: string | null;
  properties?: {
    id: string;
    title: string;
    price?: number | null;
  } | null;
  assigned_profile?: {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
}

export interface TimelineEvent {
  id: string;
  created_at: string;
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
