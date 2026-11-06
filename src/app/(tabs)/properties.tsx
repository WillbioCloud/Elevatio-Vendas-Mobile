import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertCircle,
  Bath,
  Bed,
  Building2,
  Car,
  Eye,
  EyeOff,
  Filter,
  MapPin,
  Maximize2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Star,
  UserCheck,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Property } from '../../types';
import { formatCurrency } from '../../utils/crm';

type FilterType = 'all' | 'sale' | 'rent' | 'temporada' | 'legal_pending' | 'inactive';

function getListingTypeLabel(listingType?: string | null): string {
  if (!listingType) return 'VENDA';
  const lower = listingType.toLowerCase();
  if (lower === 'sale' || lower === 'venda') return 'VENDA';
  if (lower === 'rent' || lower === 'locacao' || lower === 'locação') return 'LOCAÇÃO';
  if (lower === 'temporada' || lower === 'seasonal') return 'TEMPORADA';
  return listingType.toUpperCase();
}

export default function PropertiesScreen() {
  const router = useRouter();
  const { user, profile, company, permissions } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [onlyMyProperties, setOnlyMyProperties] = useState(false);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('properties')
        .select('id, title, slug, price, condominium, iptu, type, listing_type, status, city, neighborhood, state, bedrooms, suites, bathrooms, area, garage, images, featured, has_intermediation_signed, created_at, agent_id, owner_name, owner_phone, key_status')
        .order('created_at', { ascending: false });

      if (profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      setProperties((data as unknown as Property[]) || []);
    } catch (err) {
      console.warn('Erro ao carregar imóveis:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProperties();
  };

  // Toggle Featured (Destaque)
  const handleToggleFeatured = async (property: Property) => {
    try {
      const nextVal = !property.featured;
      const { error } = await supabase
        .from('properties')
        .update({ featured: nextVal })
        .eq('id', property.id);

      if (error) throw error;

      setProperties((prev) =>
        prev.map((p) => (p.id === property.id ? { ...p, featured: nextVal } : p))
      );
    } catch (err: any) {
      Alert.alert('Erro ao atualizar destaque', err.message);
    }
  };

  // Toggle Ativo / Inativo
  const handleToggleStatus = async (property: Property) => {
    try {
      const nextStatus = property.status === 'Disponível' ? 'Inativo' : 'Disponível';
      const { error } = await supabase
        .from('properties')
        .update({ status: nextStatus })
        .eq('id', property.id);

      if (error) throw error;

      setProperties((prev) =>
        prev.map((p) => (p.id === property.id ? { ...p, status: nextStatus } : p))
      );
    } catch (err: any) {
      Alert.alert('Erro ao alterar status', err.message);
    }
  };

  // Compartilhamento Direto WhatsApp
  const handleShareWhatsApp = (item: Property) => {
    const publicDomain = company?.domain || `${company?.subdomain || 'app'}.elevatiovendas.com.br`;
    const url = item.slug ? `https://${publicDomain}/imovel/${item.slug}` : `https://${publicDomain}`;
    const text = encodeURIComponent(
      `Confira este imóvel que selecionei para você:\n\n*${item.title}*\n${item.neighborhood}, ${item.city} - ${item.state}\nValor: *${formatCurrency(item.price)}*\n\nVeja as fotos e detalhes completos aqui:\n${url}`
    );
    Linking.openURL(`whatsapp://send?text=${text}`).catch(() => {
      Linking.openURL(`https://wa.me/?text=${text}`);
    });
  };

  // Compartilhamento Nativo
  const handleShareNative = async (item: Property) => {
    try {
      const publicDomain = company?.domain || `${company?.subdomain || 'app'}.elevatiovendas.com.br`;
      const url = item.slug ? `https://${publicDomain}/imovel/${item.slug}` : `https://${publicDomain}`;
      await Share.share({
        title: item.title,
        message: `Confira este imóvel: ${item.title}\nValor: ${formatCurrency(item.price)}\n${url}`,
        url,
      });
    } catch (err) {
      console.warn('Erro ao compartilhar imóvel:', err);
    }
  };

  // Filtros combinados
  const filteredProperties = useMemo(() => {
    return properties.filter((item) => {
      // Filtro de dono (apenas meus imóveis)
      if (onlyMyProperties && item.agent_id !== user?.id) {
        return false;
      }

      // Filtro de aba
      if (activeFilter === 'sale' && item.listing_type !== 'sale') return false;
      if (activeFilter === 'rent' && item.listing_type !== 'rent') return false;
      if (activeFilter === 'temporada' && item.listing_type !== 'temporada') return false;
      if (activeFilter === 'legal_pending' && item.has_intermediation_signed) return false;
      if (activeFilter === 'inactive' && item.status === 'Disponível') return false;

      // Filtro de busca
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchCity = (item.city || '').toLowerCase().includes(q);
      const matchNeigh = (item.neighborhood || '').toLowerCase().includes(q);
      return matchTitle || matchCity || matchNeigh;
    });
  }, [properties, activeFilter, onlyMyProperties, search, user?.id]);

  const activeCount = properties.filter((p) => p.status === 'Disponível').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* Header com Título e Botão Nova Captação */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
              Imóveis & Carteira
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              {activeCount} ativos • {properties.length} no catálogo
            </Text>
          </View>

          {permissions.canCreateProperty && (
            <TouchableOpacity
              onPress={() => router.push('/property-form')}
              style={{
                backgroundColor: '#0ea5e9',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#ffffff" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                Nova Captação
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Barra de Busca Instantânea */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
            marginTop: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por título, bairro ou cidade..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, fontSize: 13, color: colors.text }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Barra de Filtros + Toggle "Apenas meus imóveis" */}
      <View style={{ marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {/* Toggle Apenas Meus Imóveis */}
          <TouchableOpacity
            onPress={() => setOnlyMyProperties(!onlyMyProperties)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: onlyMyProperties ? '#0284c7' : colors.card,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: onlyMyProperties ? '#0284c7' : colors.border,
            }}
          >
            <UserCheck size={13} color={onlyMyProperties ? '#ffffff' : colors.textMuted} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: onlyMyProperties ? '700' : '500',
                color: onlyMyProperties ? '#ffffff' : colors.text,
              }}
            >
              Apenas Meus
            </Text>
          </TouchableOpacity>

          {[
            { id: 'all' as FilterType, label: 'Todos' },
            { id: 'sale' as FilterType, label: 'Venda' },
            { id: 'rent' as FilterType, label: 'Locação' },
            { id: 'temporada' as FilterType, label: 'Temporada' },
            { id: 'legal_pending' as FilterType, label: 'Pendências Jurídicas' },
            { id: 'inactive' as FilterType, label: 'Inativos / Vendidos' },
          ].map((pill) => {
            const isSelected = activeFilter === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                onPress={() => setActiveFilter(pill.id)}
                style={{
                  backgroundColor: isSelected ? '#0ea5e9' : colors.card,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isSelected ? '#0ea5e9' : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? '#ffffff' : colors.text,
                  }}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de Imóveis */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0ea5e9" size="large" />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>
            Carregando catálogo de imóveis...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Building2 size={36} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                Nenhum imóvel encontrado
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                Tente ajustar os filtros ou cadastre uma nova captação.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const coverImage =
              item.images && item.images.length > 0
                ? item.images[0]
                : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800';

            const isAvailable = item.status === 'Disponível';
            const isSold = item.status === 'Vendido';
            const hasLegalIntermediation = !!item.has_intermediation_signed;

            return (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  overflow: 'hidden',
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {/* Imagem de Capa com Badges e Botão Destaque */}
                <View style={{ position: 'relative', height: 180, width: '100%', backgroundColor: colors.mutedSurface }}>
                  <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} />

                  {/* Badge de Modalidade (Venda / Locação) */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      backgroundColor: 'rgba(8, 47, 73, 0.9)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                      {getListingTypeLabel(item.listing_type)}
                    </Text>
                  </View>

                  {/* Badge de Status do Imóvel */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 10,
                      backgroundColor: isAvailable
                        ? '#10b981'
                        : isSold
                        ? '#0284c7'
                        : '#64748b',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>

                  {/* Botão Estrela de Destaque */}
                  <TouchableOpacity
                    onPress={() => handleToggleFeatured(item)}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: 'rgba(0, 0, 0, 0.65)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    activeOpacity={0.8}
                  >
                    <Star
                      size={16}
                      color={item.featured ? '#f59e0b' : '#ffffff'}
                      fill={item.featured ? '#f59e0b' : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Conteúdo do Card */}
                <View style={{ padding: 14 }}>
                  {/* Badge de Regularização Jurídica */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {hasLegalIntermediation ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                        }}
                      >
                        <ShieldCheck size={12} color="#10b981" />
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#10b981' }}>
                          Intermediação Assinada
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                        }}
                      >
                        <AlertCircle size={12} color="#f59e0b" />
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#f59e0b' }}>
                          Pendente de Autorização
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Título e Valor */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {(item.code || item.slug || item.id) ? (
                      <View
                        style={{
                          backgroundColor: colors.mutedSurface,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>
                          #{item.code || item.slug?.slice(0, 8) || item.id.slice(0, 6).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#10b981' }}>
                      {formatCurrency(item.price)}
                    </Text>
                    {item.condominium && item.condominium > 0 ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Cond: {formatCurrency(item.condominium)}
                      </Text>
                    ) : null}
                    {item.iptu && item.iptu > 0 ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        IPTU: {formatCurrency(item.iptu)}
                      </Text>
                    ) : null}
                  </View>

                  {/* Localização */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                    <MapPin size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1 }} numberOfLines={1}>
                      {item.neighborhood ? `${item.neighborhood}, ` : ''}{item.city} - {item.state}
                    </Text>
                  </View>

                  {/* Especificações: Quartos, Banheiros, Vagas, Área */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 8,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Bed size={14} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                        {item.bedrooms || 0}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Bath size={14} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                        {item.bathrooms || 0}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Car size={14} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                        {item.garage || 0}
                      </Text>
                    </View>
                    {item.area > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Maximize2 size={13} color={colors.textMuted} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                          {item.area} m²
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Ações Rápidas: Alternar Status, WhatsApp, Compartilhar, Editar */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(item)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: colors.mutedSurface,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      activeOpacity={0.8}
                    >
                      {isAvailable ? (
                        <>
                          <EyeOff size={13} color={colors.textMuted} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>Inativar</Text>
                        </>
                      ) : (
                        <>
                          <Eye size={13} color="#10b981" />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#10b981' }}>Ativar</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/property-form', params: { id: item.id } })}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: colors.mutedSurface,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      activeOpacity={0.8}
                    >
                      <Pencil size={14} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareWhatsApp(item)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
                      }}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={14} color="#10b981" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareNative(item)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: colors.mutedSurface,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      activeOpacity={0.8}
                    >
                      <Share2 size={15} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
