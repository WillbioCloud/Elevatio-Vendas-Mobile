import React from 'react';
import {
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  Calendar,
  Clock,
  MessageCircle,
  Phone,
  UserCheck,
} from 'lucide-react-native';
import { Lead } from '../../types';
import { useAppTheme } from '../../context/ThemeContext';
import { formatCurrency, formatPhone, formatTimeInStage, getLeadSlaHealth, timeAgo } from '../../utils/crm';

interface LeadCardProps {
  lead: Lead;
  showAssignee?: boolean;
  onPress: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  showAssignee = false,
  onPress,
}) => {
  const { colors, isDark } = useAppTheme();
  const sla = getLeadSlaHealth(lead);

  const handleOpenWhatsApp = () => {
    if (!lead.phone) return;
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const firstWord = lead.name ? lead.name.trim().split(' ')[0] : 'Cliente';
    const text = encodeURIComponent(
      `Olá, ${firstWord}! Tudo bem? Sou da imobiliária e estou entrando em contato sobre seu interesse no imóvel.`
    );
    Linking.openURL(`whatsapp://send?phone=55${cleanPhone}&text=${text}`).catch(() => {
      Linking.openURL(`https://wa.me/55${cleanPhone}?text=${text}`);
    });
  };

  const handleCall = () => {
    if (!lead.phone) return;
    Linking.openURL(`tel:${lead.phone}`);
  };

  const getStatusBadge = () => {
    const s = (lead.status || '').toLowerCase();
    if (s.includes('fechad') || s.includes('venda')) {
      return { bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5', text: '#10b981' };
    }
    if (s.includes('perdid') || s.includes('recusad')) {
      return { bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', text: '#ef4444' };
    }
    if (s.includes('proposta') || s.includes('visita')) {
      return { bg: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe', text: '#0ea5e9' };
    }
    return { bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', text: '#f59e0b' };
  };

  const badge = getStatusBadge();
  const timeInStage = formatTimeInStage(lead.stage_updated_at || lead.updated_at || lead.created_at);
  const lastActive = lead.last_interaction ? `Atualizado: ${timeAgo(lead.last_interaction)}` : null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(lead)}
      style={{
        backgroundColor: colors.card,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      {/* SLA Health Indicator: Minimalist 3px Bar */}
      <View
        style={{
          width: 3.5,
          backgroundColor: sla.color,
        }}
      />

      {/* Card Content */}
      <View style={{ flex: 1, padding: 14 }}>
        {/* Header: Name and Status Badge */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.text,
              }}
              numberOfLines={1}
            >
              {lead.name}
            </Text>

            {/* Time in Stage and Last Update */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <Clock size={11} color={colors.textMuted} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                {timeInStage}
              </Text>
              {lastActive && (
                <>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>•</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {lastActive}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View
            style={{
              backgroundColor: badge.bg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: badge.text,
              }}
            >
              {lead.status}
            </Text>
          </View>
        </View>

        {/* Property interest or budget */}
        {(lead.properties?.title || lead.property_title || (lead.budget && lead.budget > 0)) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.mutedSurface,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              marginVertical: 6,
              gap: 6,
            }}
          >
            <Building2 size={13} color="#0ea5e9" />
            <Text
              style={{
                fontSize: 12,
                color: colors.text,
                fontWeight: '500',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {lead.properties?.title || lead.property_title || 'Interesse Imobiliário'}
            </Text>
            {lead.budget && lead.budget > 0 ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
                {formatCurrency(lead.budget)}
              </Text>
            ) : null}
          </View>
        )}

        {/* Footer: Broker name (if team view), Phone, and Action Buttons */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            {showAssignee && (lead.assigned_user?.name || lead.assigned_profile?.name) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <UserCheck size={12} color="#0ea5e9" />
                <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                  {(lead.assigned_user?.name || lead.assigned_profile?.name || '').split(' ')[0]}
                </Text>
              </View>
            )}

            {lead.source && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Origem: <Text style={{ fontWeight: '600', color: colors.text }}>{lead.source}</Text>
                </Text>
              </View>
            )}
          </View>

          {/* Quick Action Buttons: WhatsApp & Call */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {lead.phone ? (
              <>
                <TouchableOpacity
                  onPress={handleCall}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: colors.mutedSurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  activeOpacity={0.7}
                >
                  <Phone size={14} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenWhatsApp}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
                  }}
                  activeOpacity={0.7}
                >
                  <MessageCircle size={14} color="#10b981" />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
