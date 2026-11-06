import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Award, Check, DollarSign, Home, X } from 'lucide-react-native';
import { Lead, Property } from '../../types';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/crm';

interface CloseSaleModalProps {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSaleSuccess: () => void;
}

export const CloseSaleModal: React.FC<CloseSaleModalProps> = ({
  visible,
  lead,
  onClose,
  onSaleSuccess,
}) => {
  const { user, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [dealValue, setDealValue] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && profile?.company_id) {
      // Set initial value from lead budget if present
      if (lead?.budget) {
        setDealValue(lead.budget.toString());
      } else {
        setDealValue('');
      }
      setSelectedPropertyId(lead?.property_id || null);

      // Fetch company available properties
      const fetchProps = async () => {
        setLoadingProps(true);
        try {
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('title', { ascending: true })
            .limit(50);

          if (!error && data) {
            setProperties(data as Property[]);
          }
        } catch (err) {
          console.warn('Erro ao carregar imóveis:', err);
        } finally {
          setLoadingProps(false);
        }
      };

      fetchProps();
    }
  }, [visible, lead, profile?.company_id]);

  const handleConfirmSale = async () => {
    if (!lead || !user) return;
    const numericValue = parseFloat(dealValue.replace(/[^\d.,]/g, '').replace(',', '.'));

    if (isNaN(numericValue) || numericValue <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe o valor total da venda.');
      return;
    }

    try {
      setSaving(true);

      // 1. Atualizar lead para Venda Fechada
      const { error: leadErr } = await supabase
        .from('leads')
        .update({
          status: 'Venda Fechada',
          budget: numericValue,
          property_id: selectedPropertyId || lead.property_id,
          stage_updated_at: new Date().toISOString(),
          last_interaction: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (leadErr) throw leadErr;

      // 2. Se um imóvel foi selecionado, marcá-lo como Vendido
      if (selectedPropertyId) {
        await supabase
          .from('properties')
          .update({
            status: 'Vendido',
          })
          .eq('id', selectedPropertyId);
      }

      // 3. Inserir timeline_event de celebração
      const propTitle = properties.find((p) => p.id === selectedPropertyId)?.title || lead.properties?.title || lead.property_title || 'Imóvel';
      await supabase.from('timeline_events').insert({
        lead_id: lead.id,
        title: 'Venda Fechada com Sucesso!',
        description: `Negócio concluído no valor de ${formatCurrency(numericValue)} referente ao imóvel "${propTitle}". Parabéns pelo fechamento!`,
        type: 'deal_closed',
        created_by: user.id,
      });

      // 4. Bonificação de Gamificação (+500 XP)
      const currentXp = profile?.xp_points || 0;
      await supabase
        .from('profiles')
        .update({
          xp_points: currentXp + 500,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      Alert.alert('Parabéns! 🚀', `Venda registrada com sucesso! Você conquistou +500 XP na Liga dos Corretores.`);
      onSaleSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao fechar venda', err.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '90%',
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
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={20} color="#10b981" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Fechar Venda
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {lead?.name}
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

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Banner de XP */}
            <View
              style={{
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#a7f3d0',
              }}
            >
              <Award size={20} color="#10b981" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#10b981' }}>
                  Premiação de Fechamento
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Ao registrar esta venda, você receberá +500 XP na sua pontuação da Liga.
                </Text>
              </View>
            </View>

            {/* Input Valor da Venda */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Valor Total da Venda (VGV) *
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.mutedSurface,
                borderRadius: 12,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            >
              <DollarSign size={16} color={colors.textMuted} />
              <TextInput
                value={dealValue}
                onChangeText={setDealValue}
                placeholder="Ex: 450000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                }}
              />
            </View>

            {/* Seletor do Imóvel Vendido */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Imóvel Vendido
            </Text>
            {loadingProps ? (
              <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 12 }} />
            ) : properties.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
                Nenhum imóvel disponível cadastrado na empresa.
              </Text>
            ) : (
              <View style={{ maxHeight: 200, marginBottom: 16 }}>
                <ScrollView nestedScrollEnabled style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                  {properties.map((prop) => {
                    const isSelected = selectedPropertyId === prop.id;
                    return (
                      <TouchableOpacity
                        key={prop.id}
                        onPress={() => setSelectedPropertyId(isSelected ? null : prop.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 12,
                          backgroundColor: isSelected ? (isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe') : colors.card,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected ? '#0ea5e9' : colors.text,
                            }}
                            numberOfLines={1}
                          >
                            {prop.title}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            {formatCurrency(prop.price)} • {prop.status}
                          </Text>
                        </View>
                        {isSelected && <Check size={16} color="#0ea5e9" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Botão de Confirmação */}
            <TouchableOpacity
              onPress={handleConfirmSale}
              disabled={saving}
              style={{
                backgroundColor: '#10b981',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
                marginBottom: 20,
              }}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                  Confirmar Venda e Ganhar XP
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
