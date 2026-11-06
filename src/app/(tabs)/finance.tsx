import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Eye,
  EyeOff,
  QrCode,
  ShieldAlert,
  Wallet,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { AgentCommission, Invoice, OperatingExpense } from '../../types';

export default function FinanceScreen() {
  const { user, profile, company, isCorretor, isSoloBroker, isOwner, isAdmin, isManager } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  // Estados Corretor Associado
  const [commissions, setCommissions] = useState<AgentCommission[]>([]);
  const [commissionStats, setCommissionStats] = useState({
    paidTotal: 0,
    pendingTotal: 0,
    blockedTotal: 0,
  });

  // Estados Gestor / Solo Broker
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [managementStats, setManagementStats] = useState({
    totalReceived: 0,
    totalToReceive: 0,
    totalExpenses: 0,
    netBalance: 0,
  });

  // REGRA DE OURO DO SDD:
  // Corretor associado vê EXCLUSIVAMENTE Minhas Comissões
  // Dono, Gerente e Corretor Autônomo (solo_broker) veem o Caixa Inteligente estilo Nubank
  const isAssociateCorretorMode = isCorretor && !isSoloBroker;

  const loadFinancialData = useCallback(async () => {
    try {
      if (!user) return;

      if (isAssociateCorretorMode) {
        // Carrega comissões do agente autenticado
        const { data, error } = await supabase
          .from('agent_commissions')
          .select('*')
          .eq('agent_id', user.id)
          .order('due_date', { ascending: false });

        if (error) throw error;
        const commList = (data as AgentCommission[]) || [];
        setCommissions(commList);

        const paid = commList.filter(c => c.status === 'paid').reduce((acc, c) => acc + (c.amount || 0), 0);
        const pending = commList.filter(c => c.status === 'pending' || c.status === 'a_pagar').reduce((acc, c) => acc + (c.amount || 0), 0);
        const blocked = commList.filter(c => c.status === 'bloqueado').reduce((acc, c) => acc + (c.amount || 0), 0);

        setCommissionStats({
          paidTotal: paid,
          pendingTotal: pending,
          blockedTotal: blocked,
        });
      } else {
        // Modo Caixa Inteligente (Owner, Manager, Admin, Solo Broker)
        let invoiceQuery = supabase.from('invoices').select('*').order('due_date', { ascending: false });
        let expenseQuery = supabase.from('operating_expenses').select('*').order('due_date', { ascending: false });

        if (profile?.company_id) {
          invoiceQuery = invoiceQuery.eq('company_id', profile.company_id);
          expenseQuery = expenseQuery.eq('company_id', profile.company_id);
        }

        const [{ data: invData }, { data: expData }] = await Promise.all([
          invoiceQuery,
          expenseQuery,
        ]);

        const invList = (invData as Invoice[]) || [];
        const expList = (expData as OperatingExpense[]) || [];

        setInvoices(invList);
        setExpenses(expList);

        const received = invList.filter(i => i.status === 'pago').reduce((acc, i) => acc + (i.amount || 0), 0);
        const toReceive = invList.filter(i => i.status === 'pendente' || i.status === 'atrasado').reduce((acc, i) => acc + (i.amount || 0), 0);
        const exp = expList.filter(e => e.status === 'paid').reduce((acc, e) => acc + (e.amount || 0), 0);

        setManagementStats({
          totalReceived: received,
          totalToReceive: toReceive,
          totalExpenses: exp,
          netBalance: received - exp,
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile?.company_id, isAssociateCorretorMode]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFinancialData();
  };

  const formatBRL = (val: number) =>
    Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: colors.text }}>
            {isAssociateCorretorMode ? 'Minhas Comissões' : 'Caixa Inteligente'}
          </Text>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
            {isAssociateCorretorMode
              ? 'Acompanhamento pessoal de repasses'
              : 'Visão financeira executiva da operação'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setHideBalance(!hideBalance)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hideBalance ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
        </TouchableOpacity>
      </View>

      {/* Renderização Condicional por Perfil */}
      {isAssociateCorretorMode ? (
        // ----------------- MODO CORRETOR ASSOCIADO -----------------
        <View>
          {/* Card Principal: Total Liberado */}
          <View
            style={{
              backgroundColor: '#082f49',
              borderRadius: 22,
              padding: 22,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#0284c7',
            }}
          >
            <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#38bdf8' }}>
              Comissões a Receber
            </Text>
            <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 32, color: '#ffffff', marginTop: 4 }}>
              {hideBalance ? 'R$ ••••••' : formatBRL(commissionStats.pendingTotal)}
            </Text>

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(56, 189, 248, 0.2)' }}>
              <View>
                <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: '#94a3b8' }}>Recebido este mês</Text>
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 16, color: '#10b981', marginTop: 2 }}>
                  {hideBalance ? '••••' : formatBRL(commissionStats.paidTotal)}
                </Text>
              </View>
              <View>
                <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: '#94a3b8' }}>Aguardando Escritura</Text>
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 16, color: '#f59e0b', marginTop: 2 }}>
                  {hideBalance ? '••••' : formatBRL(commissionStats.blockedTotal)}
                </Text>
              </View>
            </View>
          </View>

          {/* Card Chave PIX */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: 'rgba(14, 165, 233, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QrCode size={20} color="#0ea5e9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 13, color: colors.text }}>
                  Chave PIX Cadastrada
                </Text>
                <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {profile?.pix_key || 'Nenhuma chave cadastrada em Ajustes'}
                </Text>
              </View>
            </View>
          </View>

          {/* Histórico de Comissões */}
          <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 17, color: colors.text, marginBottom: 12 }}>
            Extrato de Comissões
          </Text>

          {loading ? (
            <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 20 }} />
          ) : commissions.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Wallet size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.text }}>
                Nenhuma comissão registrada
              </Text>
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                Suas vendas e locações fechadas aparecerão listadas aqui.
              </Text>
            </View>
          ) : (
            commissions.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: colors.text, flex: 1 }}>
                    {item.description}
                  </Text>
                  <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 16, color: '#10b981' }}>
                    {hideBalance ? '••••' : formatBRL(item.amount)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
                    Taxa: {item.commission_rate}%
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        item.status === 'paid'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Sora_600SemiBold',
                        fontSize: 11,
                        color: item.status === 'paid' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {item.status === 'paid' ? 'Pago' : 'A Liberar'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        // ----------------- MODO CAIXA NUBANK (OWNER / SOLO BROKER / GESTOR) -----------------
        <View>
          {/* Hero Card Estilo Nubank */}
          <View
            style={{
              backgroundColor: '#082f49',
              borderRadius: 24,
              padding: 24,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#0284c7',
            }}
          >
            <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#38bdf8' }}>
              Saldo Líquido Operacional
            </Text>
            <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 34, color: '#ffffff', marginTop: 6 }}>
              {hideBalance ? 'R$ ••••••' : formatBRL(managementStats.netBalance)}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ArrowUpRight size={14} color="#10b981" />
                  <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#10b981' }}>Recebido</Text>
                </View>
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: '#ffffff', marginTop: 4 }}>
                  {hideBalance ? '••••' : formatBRL(managementStats.totalReceived)}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(244, 63, 94, 0.3)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ArrowDownRight size={14} color="#f43f5e" />
                  <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#f43f5e' }}>Despesas</Text>
                </View>
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: '#ffffff', marginTop: 4 }}>
                  {hideBalance ? '••••' : formatBRL(managementStats.totalExpenses)}
                </Text>
              </View>
            </View>
          </View>

          {/* Faturas a Receber */}
          <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 17, color: colors.text, marginBottom: 12 }}>
            Faturas e Cobranças Ativas
          </Text>

          {loading ? (
            <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 20 }} />
          ) : invoices.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <DollarSign size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.text }}>
                Nenhuma cobrança registrada
              </Text>
            </View>
          ) : (
            invoices.map((inv) => (
              <View
                key={inv.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: colors.text }}>
                    {inv.client_name}
                  </Text>
                  <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 16, color: '#0ea5e9' }}>
                    {hideBalance ? '••••' : formatBRL(inv.amount)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
                    Vencimento: {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        inv.status === 'pago'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Sora_600SemiBold',
                        fontSize: 11,
                        color: inv.status === 'pago' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {inv.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
