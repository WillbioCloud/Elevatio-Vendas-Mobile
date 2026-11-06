import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  Clock,
  Copy,
  FileCheck,
  MessageCircle,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react-native';
import { Contract, ContractSignature } from '../../types';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { timeAgo } from '../../utils/crm';

interface SignatureTrackerModalProps {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onRefreshContract?: () => void;
}

export const SignatureTrackerModal: React.FC<SignatureTrackerModalProps> = ({
  visible,
  contract,
  onClose,
  onRefreshContract,
}) => {
  const { colors, isDark } = useAppTheme();
  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignatures = async () => {
    if (!contract?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSignatures((data as ContractSignature[]) || []);
    } catch (err) {
      console.warn('Erro ao carregar assinaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && contract) {
      fetchSignatures();
    }
  }, [visible, contract]);

  const handleCopyLink = (signer: ContractSignature) => {
    if (!signer.token) {
      Alert.alert('Aviso', 'Token de assinatura não encontrado.');
      return;
    }
    const link = `https://elevatiovendas.com.br/assinar/${signer.token}`;
    Clipboard.setString(link);
    Alert.alert('Link Copiado!', `O link para assinatura de ${signer.signer_name} foi copiado para a área de transferência.`);
  };

  const handleSendWhatsApp = (signer: ContractSignature) => {
    if (!signer.token) return;
    const link = `https://elevatiovendas.com.br/assinar/${signer.token}`;
    const cleanPhone = (signer.signer_phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá, ${signer.signer_name}! Segue o link seguro para assinatura eletrônica do seu documento na Elevatio Vendas:\n\n${link}\n\nO processo é rápido, 100% digital e com validade jurídica.`
    );

    const url = cleanPhone
      ? `whatsapp://send?phone=55${cleanPhone}&text=${message}`
      : `whatsapp://send?text=${message}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        cleanPhone
          ? `https://wa.me/55${cleanPhone}?text=${message}`
          : `https://wa.me/?text=${message}`
      );
    });
  };

  if (!contract) return null;

  const totalSignatures = signatures.length;
  const signedCount = signatures.filter((s) => s.status === 'signed').length;
  const progressPercent = totalSignatures > 0 ? (signedCount / totalSignatures) * 100 : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '85%',
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
                <ShieldCheck size={20} color="#0ea5e9" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Rastreamento de Assinaturas
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {signedCount} de {totalSignatures} assinaturas coletadas
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

          {/* Barra de Progresso */}
          <View style={{ marginBottom: 18 }}>
            <View
              style={{
                height: 6,
                backgroundColor: colors.mutedSurface,
                borderRadius: 3,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: progressPercent === 100 ? '#10b981' : '#0ea5e9',
                  borderRadius: 3,
                }}
              />
            </View>
          </View>

          {/* Lista de Signatários */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 24 }} />
            ) : signatures.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Clock size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  Nenhum signatário registrado
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                  Os signatários são vinculados automaticamente quando o contrato é gerado.
                </Text>
              </View>
            ) : (
              signatures.map((signer) => {
                const isSigned = signer.status === 'signed';
                const isRefused = signer.status === 'refused';

                return (
                  <View
                    key={signer.id}
                    style={{
                      backgroundColor: colors.mutedSurface,
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: isSigned
                        ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0')
                        : colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                          {signer.signer_name}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          Papel: <Text style={{ fontWeight: '600', color: colors.text }}>{signer.signer_role || 'Signatário'}</Text>
                          {signer.signer_email ? ` • ${signer.signer_email}` : ''}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: isSigned
                            ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5')
                            : isRefused
                            ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2')
                            : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7'),
                        }}
                      >
                        {isSigned ? (
                          <CheckCircle2 size={12} color="#10b981" />
                        ) : isRefused ? (
                          <XCircle size={12} color="#ef4444" />
                        ) : (
                          <Clock size={12} color="#f59e0b" />
                        )}
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: isSigned ? '#10b981' : isRefused ? '#ef4444' : '#f59e0b',
                          }}
                        >
                          {isSigned ? 'Assinado' : isRefused ? 'Recusado' : 'Pendente'}
                        </Text>
                      </View>
                    </View>

                    {/* Detalhes de Assinatura ou Ações de Envio */}
                    {isSigned ? (
                      <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '500' }}>
                          ✓ Assinado em {signer.signed_at ? new Date(signer.signed_at).toLocaleString('pt-BR') : 'Data registrada'}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                          marginTop: 10,
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => handleSendWhatsApp(signer)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            backgroundColor: '#10b981',
                            paddingVertical: 8,
                            borderRadius: 8,
                          }}
                          activeOpacity={0.8}
                        >
                          <MessageCircle size={14} color="#ffffff" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleCopyLink(signer)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            backgroundColor: colors.card,
                            paddingVertical: 8,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                          activeOpacity={0.8}
                        >
                          <Copy size={14} color={colors.text} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Copiar Link</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

