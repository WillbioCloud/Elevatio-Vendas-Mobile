import { AppSettings, Company, Profile } from '../types';

export interface PermissionContext {
  profile: Profile | null;
  company: Company | null;
  settings?: AppSettings | null;
}

export function getPermissions(ctx: PermissionContext) {
  const { profile, company, settings } = ctx;
  const role = profile?.role || 'corretor';
  const userPerms = profile?.permissions || {};
  const rolePerms = settings?.permissions?.role_permissions?.[role] || {};

  // Combina permissões do cargo com exceções do usuário
  const perms = { ...rolePerms, ...userPerms };

  const isSuperOrOwner = role === 'super_admin' || role === 'owner';
  const isManagerOrAdmin = role === 'manager' || role === 'admin';
  const isSoloBroker = company?.business_type === 'solo_broker';
  const isAssociatedBroker = role === 'corretor' && !isSoloBroker;

  // Leads
  const canViewTeamLeads =
    isSuperOrOwner || isManagerOrAdmin || isSoloBroker || !!perms.leads_view_team;

  const canRedistributeLeads =
    isSuperOrOwner || isManagerOrAdmin || !!perms.leads_redistribute;

  const canDeleteLeads =
    isSuperOrOwner || isManagerOrAdmin || !!perms.leads_delete;

  // Imóveis
  const canViewAllProperties =
    isSuperOrOwner || isManagerOrAdmin || isSoloBroker || !!perms.properties_view_all;

  const canCreateProperty =
    isSuperOrOwner || isManagerOrAdmin || isSoloBroker || !!perms.properties_create;

  const canEditProperty = (propertyAgentId?: string | null, userId?: string | null) => {
    if (isSuperOrOwner || isManagerOrAdmin || isSoloBroker || perms.properties_edit) return true;
    if (userId && propertyAgentId === userId) return true;
    return false;
  };

  const canDeleteProperty =
    isSuperOrOwner || isManagerOrAdmin || !!perms.properties_delete;

  // Contratos
  const canViewAllContracts =
    isSuperOrOwner || isManagerOrAdmin || isSoloBroker || !!perms.contracts_view_all;

  const canApproveContract =
    isSuperOrOwner || isManagerOrAdmin;

  // Financeiro
  const canViewAllFinance =
    isSuperOrOwner || isManagerOrAdmin || isSoloBroker || !!perms.finance_view_all;

  const canManageFinance =
    isSuperOrOwner || isManagerOrAdmin || isSoloBroker || !!perms.finance_manage;

  return {
    isSuperOrOwner,
    isManagerOrAdmin,
    isSoloBroker,
    isAssociatedBroker,
    canViewTeamLeads,
    canRedistributeLeads,
    canDeleteLeads,
    canViewAllProperties,
    canCreateProperty,
    canEditProperty,
    canDeleteProperty,
    canViewAllContracts,
    canApproveContract,
    canViewAllFinance,
    canManageFinance,
  };
}
