import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  CheckCheck,
  FileText,
  Info,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { NotificationItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { timeAgo } from '../../utils/crm';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onNotificationRead?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  onNotificationRead,
}) => {
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'system' | 'team'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setNotifications((data as NotificationItem[]) || []);
    } catch (err) {
      console.warn('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && user) {
      fetchNotifications();
    }
  }, [visible, user]);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onNotificationRead?.();
    } catch (err) {
      console.warn('Erro ao marcar notificações como lidas:', err);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', item.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      onNotificationRead?.();
    }

    onClose();

    if (item.link) {
      if (item.link.includes('contracts')) {
        router.push('/contracts');
      } else if (item.link.includes('leads')) {
        router.push('/(tabs)/leads');
      }
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.read;
    if (activeTab === 'system') return item.type === 'system' || item.category === 'system';
    if (activeTab === 'team') return item.type === 'team' || item.type === 'lead_assigned';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead_assigned':
        return <UserCheck size={18} color="#0ea5e9" />;
      case 'deal_closed':
        return <FileText size={18} color="#10b981" />;
      case 'system':
        return <Info size={18} color="#f59e0b" />;
      default:
        return <Bell size={18} color="#0ea5e9" />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '80%',
            borderWidth: 1,
            borderColor: colors.border,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Bell size={20} color={colors.brand} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                Notificações
              </Text>
              {unreadCount > 0 && (
                <View
                  style={{
                    backgroundColor: 'rgba(14, 165, 233, 0.15)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand }}>
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={markAllAsRead}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.mutedSurface,
                  }}
                >
                  <CheckCheck size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                    Marcar todas
                  </Text>
                </TouchableOpacity>
              )}

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
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Abas de Filtro */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 16,
              paddingVertical: 10,
              gap: 6,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            {[
              { id: 'all', label: 'Todas' },
              { id: 'unread', label: 'Não lidas' },
              { id: 'team', label: 'Equipe' },
              { id: 'system', label: 'Sistema' },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id as any)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isSelected ? colors.brand : colors.mutedSurface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? '#ffffff' : colors.textMuted,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Lista de Notificações */}
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : (
            <FlatList
              data={filteredNotifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
                  <Bell size={36} color={colors.textMuted} style={{ marginBottom: 10, opacity: 0.5 }} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    Nenhuma notificação por aqui
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    Quando surgirem avisos ou novos leads, você verá aqui.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleNotificationClick(item)}
                  style={{
                    backgroundColor: item.read ? colors.card : colors.brandSubtle,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: item.read ? colors.border : 'rgba(14, 165, 233, 0.4)',
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.mutedSurface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getIcon(item.type)}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: item.read ? '600' : '700',
                          color: colors.text,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>
                        {timeAgo(item.created_at)}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                      {item.message || item.content}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

