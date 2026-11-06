import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  MessageCircle,
  Plus,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { AgentCommission, Invoice } from '../../types';
import { formatCurrency, timeAgo } from '../../utils/crm';

interface FinancialTransaction {
  id: string;
  company_id?: string | null;
  type: 'income' | 'expense' | string;
  origin?: string | null;
  amount: number;
  balance_after?: number | null;
  friendly_description: string;
  occurred_at: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

type FinanceTab = 'overview' | 'receivables' | 'payables';

export default function FinanceScreen() {
  const { user, profile, permissions, isOwner, isAdmin, isManager, isSoloBroker } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  // Seletor de Período (Ano e Mês)
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Aba selecionada no modo Gestão
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  // Dados Corretor Associado
  const [commissions, setCommissions] = useState<AgentCommission[]>([]);

  // Dados Gestão (Owner / Manager / Solo Broker)
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

  // Modal Nova Despesa
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  // Isolamento de Acesso
  const canViewAllFinance = permissions.canViewAllFinance || isOwner || isAdmin || isManager || isSoloBroker;

  // Navegação de Mês
  const handlePrevMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const monthLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  const loadFinancialData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const startDate = new Date(currentYear, currentMonth, 1).toISOString();
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

      if (!canViewAllFinance) {
        // MODO CORRETOR: Minhas Comissões
        const { data, error } = await supabase
          .from('agent_commissions')
          .select('*')
          .eq('agent_id', user.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCommissions((data as AgentCommission[]) || []);
      } else {
        // MODO GESTÃO: Fluxo de Caixa Inteligente
        let invQuery = supabase
          .from('invoices')
          .select('*')
          .gte('due_date', startDate.split('T')[0])
          .lte('due_date', endDate.split('T')[0])
          .order('due_date', { ascending: true });

        let txQuery = supabase
          .from('financial_transactions')
          .select('*')
          .gte('occurred_at', startDate)
          .lte('occurred_at', endDate)
          .order('occurred_at', { ascending: false });

        if (profile?.company_id) {
          invQuery = invQuery.eq('company_id', profile.company_id);
          txQuery = txQuery.eq('company_id', profile.company_id);
        }

        const [{ data: invData, error: invErr }, { data: txData, error: txErr }] = await Promise.all([
          invQuery,
          txQuery,
        ]);

        if (invErr) throw invErr;
        if (txErr) throw txErr;

        setInvoices((invData as Invoice[]) || []);
        setTransactions((txData as FinancialTransaction[]) || []);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile?.company_id, canViewAllFinance, currentYear, currentMonth]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFinancialData();
  };

  // KPIs de Comissões (Corretor)
  const brokerKpis = useMemo(() => {
    let received = 0;
    let pending = 0;
    let blocked = 0;

    commissions.forEach((c) => {
      const val = Number(c.amount) || 0;
      if (c.status === 'paid') received += val;
      else if (c.status === 'bloqueado') blocked += val;
      else pending += val;
    });

    return { received, pending, blocked };
  }, [commissions]);

  // KPIs de Fluxo de Caixa (Gestão)
  const cashFlowKpis = useMemo(() => {
    let receivedTotal = 0;
    let toReceiveTotal = 0;
    let expensesTotal = 0;

    invoices.forEach((inv) => {
      const val = Number(inv.amount) || 0;
      if (inv.status === 'paid') receivedTotal += val;
      else toReceiveTotal += val;
    });

    transactions.forEach((tx) => {
      if (tx.type === 'expense') {
        expensesTotal += Number(tx.amount) || 0;
      }
    });

    const netBalance = receivedTotal - expensesTotal;
    return { receivedTotal, toReceiveTotal, expensesTotal, netBalance };
  }, [invoices, transactions]);

  // Baixar Fatura (Marcar como Paga)
  const handleSettleInvoice = async (invoice: Invoice) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: now })
        .eq('id', invoice.id);

      if (error) throw error;

      // Cria transação de entrada correspondente
      if (profile?.company_id) {
        await supabase.from('financial_transactions').insert({
          company_id: profile.company_id,
          type: 'income',
          origin: 'invoice',
          amount: invoice.amount,
          friendly_description: `Recebimento da fatura - ${invoice.client_name || invoice.description || 'Cliente'}`,
          occurred_at: now,
        });
      }

      Alert.alert('Fatura Baixada!', 'O recebimento foi confirmado e adicionado ao fluxo de caixa.');
      loadFinancialData();
    } catch (err: any) {
      Alert.alert('Erro ao baixar fatura', err.message);
    }
  };

  // Enviar Cobrança via WhatsApp
  const handleInvoiceWhatsAppBilling = (invoice: Invoice) => {
    const text = encodeURIComponent(
      `Olá, ${invoice.client_name || 'Prezado cliente'}! Tudo bem? Segue o lembrete de cobrança da fatura no valor de ${formatCurrency(invoice.amount)} com vencimento em ${new Date(invoice.due_date).toLocaleDateString('pt-BR')}.\n\nQualquer dúvida, estamos à disposição!`
    );
    Linking.openURL(`whatsapp://send?text=${text}`).catch(() => {
      Linking.openURL(`https://wa.me/?text=${text}`);
    });
  };

  // Registrar Nova Despesa
  const handleCreateExpense = async () => {
    const numAmount = parseFloat(expenseAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!expenseDescription.trim() || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Campos Obrigatórios', 'Informe a descrição e o valor da despesa.');
      return;
    }

    try {
      setSavingExpense(true);
      const now = new Date().toISOString();

      const { error } = await supabase.from('financial_transactions').insert({
        company_id: profile?.company_id || null,
        type: 'expense',
        origin: 'manual_expense',
        amount: numAmount,
        friendly_description: expenseDescription.trim(),
        occurred_at: now,
      });

      if (error) throw error;

      setExpenseDescription('');
      setExpenseAmount('');
      setShowNewExpenseModal(false);
      Alert.alert('Sucesso', 'Despesa registrada no fluxo de caixa.');
      loadFinancialData();
    } catch (err: any) {
      Alert.alert('Erro ao registrar despesa', err.message);
    } finally {
      setSavingExpense(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* Header com Título e Olho de Privacidade */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
            {canViewAllFinance ? 'Fluxo de Caixa' : 'Minhas Comissões'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {canViewAllFinance ? 'Gestão Financeira & ERP' : 'Painel Individual do Corretor'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setHideBalance(!hideBalance)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
          activeOpacity={0.7}
        >
          {hideBalance ? <EyeOff size={16} color={colors.textMuted} /> : <Eye size={16} color={colors.textMuted} />}
        </TouchableOpacity>
      </View>

      {/* Seletor de Período (Mês e Ano) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.card,
          marginHorizontal: 20,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 14,
        }}
      >
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: colors.mutedSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Calendar size={15} color="#0ea5e9" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
            {monthLabel}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: colors.mutedSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* VISTA 1: CORRETOR ASSOCIADO (MINHAS COMISSÕES) */}
      {!canViewAllFinance ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
        >
          {/* Card Principal de Comissões Recebidas */}
          <View
            style={{
              backgroundColor: isDark ? '#111827' : '#082f49',
              borderRadius: 16,
              padding: 18,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: isDark ? '#1f2937' : '#0284c7',
            }}
          >
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>Comissões Recebidas no Mês</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#ffffff', marginTop: 4 }}>
              {hideBalance ? 'R$ ••••••' : formatCurrency(brokerKpis.received)}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: '#94a3b8' }}>A Receber (Previsto)</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#f59e0b', marginTop: 2 }}>
                  {hideBalance ? '••' : formatCurrency(brokerKpis.pending)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: '#94a3b8' }}>Bloqueado</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
                  {hideBalance ? '••' : formatCurrency(brokerKpis.blocked)}
                </Text>
              </View>
            </View>
          </View>

          {/* Lista de Comissões */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
            Lançamentos de Comissões
          </Text>

          {loading ? (
            <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 20 }} />
          ) : commissions.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Wallet size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                Nenhuma comissão neste mês
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                As comissões são geradas automaticamente ao registrar contratos e faturas.
              </Text>
            </View>
          ) : (
            commissions.map((comm) => {
              const isPaid = comm.status === 'paid';
              return (
                <View
                  key={comm.id}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        {comm.description || 'Comissão de Venda'}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        Vencimento: {new Date(comm.due_date).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: isPaid
                          ? isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5'
                          : isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: isPaid ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {isPaid ? 'PAGO' : 'A RECEBER'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Valor da Comissão:</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: isPaid ? '#10b981' : colors.text }}>
                      {formatCurrency(comm.amount)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* VISTA 2: GESTÃO & SOLO BROKER (FLUXO DE CAIXA INTELIGENTE NUBANK STYLE) */
        <View style={{ flex: 1 }}>
          {/* Resumo Financeiro Inteligente */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Resultado Líquido do Mês</Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: cashFlowKpis.netBalance >= 0 ? '#10b981' : '#ef4444',
                  marginTop: 2,
                }}
              >
                {hideBalance ? 'R$ ••••••' : formatCurrency(cashFlowKpis.netBalance)}
              </Text>

              {/* Grid 3 Colunas: Entradas Realizadas, A Receber, Despesas */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ArrowDownRight size={13} color="#10b981" />
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Recebido</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                    {hideBalance ? '••' : formatCurrency(cashFlowKpis.receivedTotal)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} color="#f59e0b" />
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>A Receber</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                    {hideBalance ? '••' : formatCurrency(cashFlowKpis.toReceiveTotal)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ArrowUpRight size={13} color="#ef4444" />
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Saídas</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                    {hideBalance ? '••' : formatCurrency(cashFlowKpis.expensesTotal)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Abas: Visão Geral | A Receber | A Pagar */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 3,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {[
                { id: 'overview' as FinanceTab, label: 'Visão Geral' },
                { id: 'receivables' as FinanceTab, label: `A Receber (${invoices.length})` },
                { id: 'payables' as FinanceTab, label: 'A Pagar' },
              ].map((tab) => {
                const isSel = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderRadius: 8,
                      backgroundColor: isSel ? colors.card : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSel ? '700' : '500',
                        color: isSel ? '#0ea5e9' : colors.textMuted,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Conteúdo da Aba Selecionada */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
          >
            {/* SUB-ABA 1: VISÃO GERAL (TRANSAÇÕES RECENTES) */}
            {activeTab === 'overview' && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                  Extrato do Mês
                </Text>

                {transactions.length === 0 ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Clock size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      Nenhuma transação registrada neste período
                    </Text>
                  </View>
                ) : (
                  transactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <View
                        key={tx.id}
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: isIncome
                                ? isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5'
                                : isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isIncome ? (
                              <ArrowDownRight size={16} color="#10b981" />
                            ) : (
                              <ArrowUpRight size={16} color="#ef4444" />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                              {tx.friendly_description || 'Transação Financeira'}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted }}>
                              {timeAgo(tx.occurred_at)}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: isIncome ? '#10b981' : '#ef4444',
                          }}
                        >
                          {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* SUB-ABA 2: A RECEBER (FATURAS & COBRANÇA) */}
            {activeTab === 'receivables' && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                  Faturas de Clientes e Inquilinos
                </Text>

                {invoices.length === 0 ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <FileText size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      Nenhuma fatura a receber neste período
                    </Text>
                  </View>
                ) : (
                  invoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    return (
                      <View
                        key={inv.id}
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 10,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                              {inv.client_name || 'Cliente'}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                              {inv.description || 'Fatura de Venda / Aluguel'} • Venc: {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                            </Text>
                          </View>

                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              backgroundColor: isPaid
                                ? isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5'
                                : isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isPaid ? '#10b981' : '#f59e0b',
                              }}
                            >
                              {isPaid ? 'PAGA' : 'PENDENTE'}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>Valor da Fatura:</Text>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: isPaid ? '#10b981' : colors.text }}>
                            {formatCurrency(inv.amount)}
                          </Text>
                        </View>

                        {/* Botões de Ação na Fatura: Baixar e WhatsApp */}
                        {!isPaid && (
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                              onPress={() => handleSettleInvoice(inv)}
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
                              <CheckCircle2 size={14} color="#ffffff" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>Baixar Fatura</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleInvoiceWhatsAppBilling(inv)}
                              style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                                paddingVertical: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(14, 165, 233, 0.3)' : '#bae6fd',
                              }}
                              activeOpacity={0.8}
                            >
                              <MessageCircle size={14} color="#0ea5e9" />
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#0ea5e9' }}>Cobrar WhatsApp</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* SUB-ABA 3: A PAGAR (DESPESAS & REGISTRO) */}
            {activeTab === 'payables' && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                    Despesas do Período
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowNewExpenseModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#ef4444',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Plus size={14} color="#ffffff" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>Nova Despesa</Text>
                  </TouchableOpacity>
                </View>

                {transactions.filter((t) => t.type === 'expense').length === 0 ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <ArrowUpRight size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      Nenhuma saída registrada
                    </Text>
                  </View>
                ) : (
                  transactions
                    .filter((t) => t.type === 'expense')
                    .map((exp) => (
                      <View
                        key={exp.id}
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                            {exp.friendly_description || 'Despesa Operacional'}
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                            {timeAgo(exp.occurred_at)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>
                          - {formatCurrency(exp.amount)}
                        </Text>
                      </View>
                    ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Modal Nova Despesa */}
      <Modal visible={showNewExpenseModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Registrar Despesa</Text>
              <TouchableOpacity onPress={() => setShowNewExpenseModal(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Descrição da Despesa</Text>
            <TextInput
              value={expenseDescription}
              onChangeText={setExpenseDescription}
              placeholder="Ex: Anúncio Meta Ads, Fotógrafo, Cartório..."
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 12,
                color: colors.text,
                fontSize: 14,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Valor (R$)</Text>
            <TextInput
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              placeholder="Ex: 350,00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 12,
                color: colors.text,
                fontSize: 16,
                fontWeight: '700',
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 20,
              }}
            />

            <TouchableOpacity
              onPress={handleCreateExpense}
              disabled={savingExpense}
              style={{
                backgroundColor: '#ef4444',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {savingExpense ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>Salvar Despesa</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
