import React from 'react';
import {
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRightCircle,
  Building,
  Calendar,
  Clock,
  History,
  MessageCircle,
  Phone,
  UserCheck,
} from 'lucide-react-native';
import { Lead } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { formatCurrency, formatPhone, getLeadSlaHealth, timeAgo } from '../utils/crm';

interface LeadCardProps {
  lead: Lead;
  showAssignee?: boolean;
  onOpenStageModal: (lead: Lead) => void;
  onOpenTimeline: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  showAssignee = false,
  onOpenStageModal,
  onOpenTimeline,
}) => {
  const { colors, isDark } = useAppTheme();
  const sla = getLeadSlaHealth(lead);

  const handleOpenWhatsApp = () => {
    if (!lead.phone) return;
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const firstWord = lead.name ? lead.name.split(' ')[0] : 'Cliente';
    const text = encodeURIComponent(
      `Olá, ${firstWord}! Tudo bem? Sou da imobiliária e estou entrando em contato a respeito do seu interesse imobiliário.`
    );
    Linking.openURL(`whatsapp://send?phone=55${cleanPhone}&text=${text}`).catch(() => {
      Linking.openURL(`https://wa.me/55${cleanPhone}?text=${text}`);
    });
  };

  const handleCall = () => {
    if (!lead.phone) return;
    Linking.openURL(`tel:${lead.phone}`);
  };

  const getStatusBadgeStyle = () => {
    const s = (lead.status || '').toLowerCase();
    if (s.includes('fechad') || s.includes('venda')) {
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (s.includes('perdid') || s.includes('recusad')) {
      return { bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e', border: 'rgba(244, 63, 94, 0.3)' };
    }
    if (s.includes('proposta') || s.includes('visita')) {
      return { bg: 'rgba(14, 165, 233, 0.15)', text: '#0ea5e9', border: 'rgba(14, 165, 233, 0.3)' };
    }
    return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
  };

  const badgeStyle = getStatusBadgeStyle();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Header do Card: Nome, Data e Badge de Status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            style={{
              fontFamily: 'Sora_700Bold',
              fontSize: 16,
              color: colors.text,
            }}
            numberOfLines={1}
          >
            {lead.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 11, color: colors.textMuted }}>
              Criado {timeAgo(lead.created_at)}
            </Text>
          </View>
        </View>

        {/* Badge Status */}
        <View
          style={{
            backgroundColor: badgeStyle.bg,
            borderWidth: 1,
            borderColor: badgeStyle.border,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'Sora_600SemiBold',
              fontSize: 11,
              color: badgeStyle.text,
            }}
          >
            {lead.status}
          </Text>
        </View>
      </View>

      {/* Termômetro de Saúde do Lead (SLA) */}
      <View
        style={{
          marginTop: 12,
          paddingVertical: 8,
          paddingHorizontal: 10,
          backgroundColor: isDark ? '#082f49' : '#eff6ff',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(2, 132, 199, 0.4)' : '#dbeafe',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                fontFamily: 'Sora_700Bold',
                fontSize: 12,
                color: sla.color,
              }}
            >
              {sla.label}
            </Text>
            <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 11, color: colors.textMuted }}>
              • {sla.timeLabel}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 10, color: colors.textMuted }}>
            SLA de Contato
          </Text>
        </View>

        {/* Barra de progresso visual do SLA */}
        <View
          style={{
            height: 4,
            width: '100%',
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            borderRadius: 2,
            marginTop: 6,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${sla.percentage}%`,
              backgroundColor: sla.color,
              borderRadius: 2,
            }}
          />
        </View>
      </View>

      {/* Informações Centrais: Telefone, Imóvel e Origem */}
      <View style={{ marginTop: 12, gap: 6 }}>
        {lead.phone && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Phone size={13} color={colors.textMuted} />
            <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.text }}>
              {formatPhone(lead.phone)}
            </Text>
          </View>
        )}

        {lead.properties?.title && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Building size={13} color="#0ea5e9" />
            <Text
              style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: '#0ea5e9', flex: 1 }}
              numberOfLines={1}
            >
              Interesse: {lead.properties.title}
            </Text>
          </View>
        )}

        {/* Origem e Orçamento */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
          {lead.source && (
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 11, color: colors.textMuted }}>
                Origem: {lead.source}
              </Text>
            </View>
          )}

          {lead.budget && (
            <View
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#10b981' }}>
                Orçamento: {formatCurrency(lead.budget)}
              </Text>
            </View>
          )}

          {showAssignee && lead.assigned_profile?.name && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <UserCheck size={12} color={colors.textMuted} />
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 11, color: colors.textMuted }}>
                {lead.assigned_profile.name}
              </Text>
            </View>
          )}
        </View>

        {/* Preview da Mensagem / Observação */}
        {lead.message && (
          <Text
            style={{
              fontFamily: 'Sora_400Regular',
              fontStyle: 'italic',
              fontSize: 12,
              color: colors.textMuted,
              marginTop: 4,
              lineHeight: 16,
            }}
            numberOfLines={2}
          >
            "{lead.message}"
          </Text>
        )}
      </View>

      {/* Ações Rápidas (Ergonomia Mobile para o Polegar) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 14,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {/* Botão Verde WhatsApp */}
        <TouchableOpacity
          onPress={handleOpenWhatsApp}
          disabled={!lead.phone}
          style={{
            flex: 1.2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: lead.phone ? '#10b981' : colors.border,
            borderRadius: 12,
            height: 42,
            gap: 6,
          }}
        >
          <MessageCircle size={17} color="#ffffff" />
          <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 12, color: '#ffffff' }}>
            WhatsApp
          </Text>
        </TouchableOpacity>

        {/* Botão Telefone */}
        {lead.phone && (
          <TouchableOpacity
            onPress={handleCall}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Phone size={17} color={colors.text} />
          </TouchableOpacity>
        )}

        {/* Botão Mudar Etapa */}
        <TouchableOpacity
          onPress={() => onOpenStageModal(lead)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(14, 165, 233, 0.12)',
            borderRadius: 12,
            height: 42,
            gap: 5,
            borderWidth: 1,
            borderColor: 'rgba(14, 165, 233, 0.3)',
          }}
        >
          <ArrowRightCircle size={16} color="#0ea5e9" />
          <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 12, color: '#0ea5e9' }}>
            Etapa
          </Text>
        </TouchableOpacity>

        {/* Botão Histórico / Timeline */}
        <TouchableOpacity
          onPress={() => onOpenTimeline(lead)}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <History size={17} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

