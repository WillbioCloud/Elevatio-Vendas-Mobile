import { Lead } from '../types';

export interface SlaHealth {
  status: 'hot' | 'warm' | 'cold' | 'none';
  label: string;
  color: string;
  percentage: number;
  timeLabel: string;
}

/**
 * Calcula o Termômetro de Saúde do Lead (SLA de Interação)
 * Quente (100%): <= 24h (#10b981)
 * Morno (50%): 24h a 48h (#f59e0b)
 * Congelando (15%): > 48h (#f43f5e)
 * Sem contato (0%): sem data (#94a3b8)
 */
export function getLeadSlaHealth(lead: Lead): SlaHealth {
  const refDateStr = lead.last_interaction || lead.stage_updated_at || lead.created_at;

  if (!refDateStr) {
    return {
      status: 'none',
      label: 'Sem contato',
      color: '#94a3b8',
      percentage: 5,
      timeLabel: 'Sem registro',
    };
  }

  const diffMs = Date.now() - new Date(refDateStr).getTime();
  const diffHours = Math.max(0, diffMs / (1000 * 60 * 60));

  let timeLabel = '';
  if (diffHours < 1) {
    const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
    timeLabel = `${mins}m atrás`;
  } else if (diffHours < 24) {
    timeLabel = `${Math.floor(diffHours)}h atrás`;
  } else {
    const days = Math.floor(diffHours / 24);
    timeLabel = `${days}d atrás`;
  }

  if (diffHours <= 24) {
    return {
      status: 'hot',
      label: 'Quente',
      color: '#10b981',
      percentage: 100,
      timeLabel,
    };
  }

  if (diffHours <= 48) {
    return {
      status: 'warm',
      label: 'Morno',
      color: '#f59e0b',
      percentage: 50,
      timeLabel,
    };
  }

  return {
    status: 'cold',
    label: 'Atenção',
    color: '#f43f5e',
    percentage: 15,
    timeLabel,
  };
}

export function formatTimeInStage(stageUpdatedAt?: string | null): string {
  if (!stageUpdatedAt) return 'Nesta etapa: 1d';
  const diffMs = Date.now() - new Date(stageUpdatedAt).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `Nesta etapa: ${mins}m`;
  }
  if (diffHours < 24) {
    return `Nesta etapa: ${diffHours}h`;
  }
  const days = Math.floor(diffHours / 24);
  return `Nesta etapa: ${days}d`;
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'R$ 0,00';
  }
  return Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Agora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m atrás`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h atrás`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export const FUNNEL_STAGES = [
  { id: 'pre_atendimento', label: 'Pré-Atendimento', statuses: ['Aguardando Atendimento', 'Tentando contato', 'Agendando'] },
  { id: 'atendimento', label: 'Em Atendimento', statuses: ['Em Atendimento', 'Sem Contato', 'Identificação de Interesse', 'Visita Agendada', 'Pedido'] },
  { id: 'proposta', label: 'Proposta', statuses: ['Elaborando Proposta', 'Proposta em Aprovação', 'Proposta', 'Proposta Aprovada', 'Proposta Recusada'] },
  { id: 'venda_ganha', label: 'Venda Fechada', statuses: ['Venda Fechada', 'Fechado'] },
  { id: 'perdido', label: 'Perdido', statuses: ['Perdido', 'Sem contato', 'Apenas pesquisando', 'Contato Inválido', 'Valor Alto', 'Sem Entrada', 'Outros'] },
];

export const LOSS_REASONS = [
  'Sem contato',
  'Apenas pesquisando',
  'Contato Inválido',
  'Valor Alto',
  'Sem Entrada',
  'Comprou com outro',
  'Desistiu da compra',
  'Outros',
];

export const LEAD_SOURCES = [
  'Manual',
  'WhatsApp',
  'Instagram',
  'Indicação',
  'Site',
  'Meta Ads',
  'Balcão',
  'Portal Imobiliário',
  'Outros',
];

