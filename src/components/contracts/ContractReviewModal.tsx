import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle,
  FileCheck,
  FileText,
  PenTool,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Contract } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/crm';

interface ContractReviewModalProps {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onOpenTracker: (contract: Contract) => void;
  onContractUpdated: () => void;
}

export const ContractReviewModal: React.FC<ContractReviewModalProps> = ({
  visible,
  contract,
  onClose,
  onOpenTracker,
  onContractUpdated,
}) => {
  const router = useRouter();
  const { user, profile, permissions } = useAuth();
  const { colors, isDark } = useAppTheme();
  const [approving, setApproving] = useState(false);

  if (!contract) return null;

  const handleApproveAndSend = async () => {
    try {
      setApproving(true);
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (error) throw error;

      // Cria notificação na empresa
      if (profile?.company_id) {
        await supabase.from('notifications').insert({
          company_id: profile.company_id,
          user_id: user?.id,
          title: 'Contrato Aprovado para Assinatura',
          message: `O contrato foi aprovado por ${profile?.name || 'Gestor'} e está pronto para assinaturas.`,
          type: 'contract_approved',
          read: false,
        });
      }

      Alert.alert('Contrato Aprovado!', 'O documento agora está pronto para coleta de assinaturas digitais.');
      onContractUpdated();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao aprovar', err.message || 'Tente novamente.');
    } finally {
      setApproving(false);
    }
  };

  const handleSignDocument = () => {
    onClose();
    router.push({
      pathname: '/signature',
      params: { contract_id: contract.id },
    });
  };

  const totalValue = contract.sale_total_value || contract.rent_value || 0;
  const isDraftOrReview = contract.status === 'draft' || contract.status === 'review';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '88%',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={20} color="#0ea5e9" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Revisão de Contrato
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  Tipo: {(contract.type || 'Contrato').toUpperCase()} • {contract.status}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.mutedSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Resumo do Documento */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>
                  Valor da Operação
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#10b981' }}>
                  {formatCurrency(totalValue)}
                </Text>
              </View>

              {contract.notes ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                  Notas: {contract.notes}
                </Text>
              ) : null}
            </View>

            {/* Conteúdo / Cláusulas do Contrato */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Termos e Cláusulas Contratuais
            </Text>
            <View
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 120,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19 }}>
                {contract.content ||
                  'Este contrato foi gerado no sistema Elevatio Vendas e reúne as obrigações e garantias legais relativas à intermediação imobiliária, com assinaturas eletrônicas auditadas nos termos da MP 2.200-2/2001 e Lei 14.063/2020.'}
              </Text>
            </View>

            {/* Ações Disponíveis */}
            <View style={{ gap: 10, marginBottom: 20 }}>
              {/* Botão de Assinar */}
              <TouchableOpacity
                onPress={handleSignDocument}
                style={{
                  backgroundColor: '#0ea5e9',
                  paddingVertical: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                activeOpacity={0.8}
              >
                <PenTool size={18} color="#ffffff" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                  Assinar este Contrato Agora
                </Text>
              </TouchableOpacity>

              {/* Botão de Rastrear Signatários */}
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenTracker(contract);
                }}
                style={{
                  backgroundColor: colors.mutedSurface,
                  paddingVertical: 13,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                activeOpacity={0.8}
              >
                <Users size={16} color={colors.text} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  Rastrear Signatários & Links WhatsApp
                </Text>
              </TouchableOpacity>

              {/* Botão de Aprovação (Se Rascunho/Revisão e Gestor) */}
              {isDraftOrReview && permissions.canCreateProperty && (
                <TouchableOpacity
                  onPress={handleApproveAndSend}
                  disabled={approving}
                  style={{
                    backgroundColor: '#10b981',
                    paddingVertical: 13,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  activeOpacity={0.8}
                >
                  {approving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <CheckCircle size={16} color="#ffffff" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                        Aprovar e Mandar para Assinatura
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

