import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
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
  Check,
  Eye,
  EyeOff,
  Filter,
  MapPin,
  Maximize2,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
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

  // Modal e Filtros Avançados
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'area_desc'>('recent');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [minBedrooms, setMinBedrooms] = useState<number>(0);
  const [minSuites, setMinSuites] = useState<number>(0);
  const [minBathrooms, setMinBathrooms] = useState<number>(0);
  const [minGarage, setMinGarage] = useState<number>(0);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');

  const availableCities = useMemo(() => {
    return Array.from(new Set(properties.map((p) => p.city).filter(Boolean))).sort() as string[];
  }, [properties]);

  const availableNeighborhoods = useMemo(() => {
    const list = selectedCity
      ? properties.filter((p) => (p.city || '').toLowerCase() === selectedCity.toLowerCase())
      : properties;
    return Array.from(new Set(list.map((p) => p.neighborhood).filter(Boolean))).sort() as string[];
  }, [properties, selectedCity]);

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (sortBy !== 'recent') count++;
    if (minPrice && parseFloat(minPrice.replace(/\D/g, '')) > 0) count++;
    if (maxPrice && parseFloat(maxPrice.replace(/\D/g, '')) > 0) count++;
    if (selectedType && selectedType !== 'Todos') count++;
    if (minBedrooms > 0) count++;
    if (minSuites > 0) count++;
    if (minBathrooms > 0) count++;
    if (minGarage > 0) count++;
    if (selectedCity) count++;
    if (selectedNeighborhood) count++;
    return count;
  }, [
    sortBy,
    minPrice,
    maxPrice,
    selectedType,
    minBedrooms,
    minSuites,
    minBathrooms,
    minGarage,
    selectedCity,
    selectedNeighborhood,
  ]);

  const handleResetFilters = () => {
    setSortBy('recent');
    setMinPrice('');
    setMaxPrice('');
    setSelectedType('Todos');
    setMinBedrooms(0);
    setMinSuites(0);
    setMinBathrooms(0);
    setMinGarage(0);
    setSelectedCity('');
    setSelectedNeighborhood('');
  };

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

  // Filtros combinados e ordenação
  const filteredProperties = useMemo(() => {
    const list = properties.filter((item) => {
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

      // Filtro de busca textual
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchCity = (item.city || '').toLowerCase().includes(q);
        const matchNeigh = (item.neighborhood || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCity && !matchNeigh) return false;
      }

      // Preço Mínimo
      if (minPrice) {
        const minVal = parseFloat(minPrice.replace(/\D/g, ''));
        if (!isNaN(minVal) && minVal > 0 && (item.price || 0) < minVal) return false;
      }

      // Preço Máximo
      if (maxPrice) {
        const maxVal = parseFloat(maxPrice.replace(/\D/g, ''));
        if (!isNaN(maxVal) && maxVal > 0 && (item.price || 0) > maxVal) return false;
      }

      // Tipo de Imóvel
      if (selectedType && selectedType !== 'Todos') {
        if ((item.type || '').toLowerCase() !== selectedType.toLowerCase()) return false;
      }

      // Quartos
      if (minBedrooms > 0 && (item.bedrooms || 0) < minBedrooms) return false;

      // Suítes
      if (minSuites > 0 && (item.suites || 0) < minSuites) return false;

      // Banheiros
      if (minBathrooms > 0 && (item.bathrooms || 0) < minBathrooms) return false;

      // Garagem
      if (minGarage > 0 && (item.garage || 0) < minGarage) return false;

      // Cidade
      if (selectedCity && (item.city || '').toLowerCase() !== selectedCity.toLowerCase()) return false;

      // Bairro
      if (
        selectedNeighborhood &&
        (item.neighborhood || '').toLowerCase() !== selectedNeighborhood.toLowerCase()
      ) {
        return false;
      }

      return true;
    });

    // Ordenação
    return list.sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'area_desc') return (b.area || 0) - (a.area || 0);
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });
  }, [
    properties,
    activeFilter,
    onlyMyProperties,
    search,
    user?.id,
    minPrice,
    maxPrice,
    selectedType,
    minBedrooms,
    minSuites,
    minBathrooms,
    minGarage,
    selectedCity,
    selectedNeighborhood,
    sortBy,
  ]);

  const activeCount = properties.filter((p) => p.status === 'Disponível').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* Header com Título e Botão Nova Captação */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
              Imóveis
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

        {/* Barra de Busca + Botão Filtros Avançados */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.card,
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 44,
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

          {/* Botão de Filtro com Badge */}
          <TouchableOpacity
            onPress={() => setShowFiltersModal(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: activeAdvancedFiltersCount > 0 ? '#0ea5e9' : colors.card,
              borderWidth: 1,
              borderColor: activeAdvancedFiltersCount > 0 ? '#0ea5e9' : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            activeOpacity={0.8}
          >
            <SlidersHorizontal
              size={18}
              color={activeAdvancedFiltersCount > 0 ? '#ffffff' : colors.text}
            />
            {activeAdvancedFiltersCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#ef4444',
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 2,
                  borderColor: colors.bg,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                  {activeAdvancedFiltersCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
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

      {/* MODAL / BOTTOMSHEET DE FILTROS AVANÇADOS */}
      <Modal visible={showFiltersModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '88%',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {/* Header do Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SlidersHorizontal size={18} color="#0ea5e9" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Filtros Avançados
                </Text>
                {activeAdvancedFiltersCount > 0 && (
                  <View
                    style={{
                      backgroundColor: '#0ea5e9',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                      {activeAdvancedFiltersCount}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={() => setShowFiltersModal(false)} activeOpacity={0.7}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Conteúdo com Scroll */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
            >
              {/* 1. Ordenação */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Ordenar Imóveis Por
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                {[
                  { id: 'recent', label: 'Mais Recentes' },
                  { id: 'price_asc', label: 'Menor Preço' },
                  { id: 'price_desc', label: 'Maior Preço' },
                  { id: 'area_desc', label: 'Maior Área (m²)' },
                ].map((sortItem) => {
                  const isSelected = sortBy === sortItem.id;
                  return (
                    <TouchableOpacity
                      key={sortItem.id}
                      onPress={() => setSortBy(sortItem.id as any)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0ea5e9' : colors.border,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {sortItem.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2. Faixa de Preço */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Faixa de Preço (R$)
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                    Preço Mínimo
                  </Text>
                  <TextInput
                    value={minPrice}
                    onChangeText={setMinPrice}
                    placeholder="Ex: 250000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.mutedSurface,
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                    Preço Máximo
                  </Text>
                  <TextInput
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    placeholder="Ex: 800000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.mutedSurface,
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
              </View>

              {/* Atalhos Rápidos de Preço */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                {[
                  { label: 'Até R$ 300 mil', min: '', max: '300000' },
                  { label: 'R$ 300k a R$ 600k', min: '300000', max: '600000' },
                  { label: 'R$ 600k a R$ 1M', min: '600000', max: '1000000' },
                  { label: 'Acima de R$ 1M', min: '1000000', max: '' },
                ].map((shortcut) => {
                  const isMatch = minPrice === shortcut.min && maxPrice === shortcut.max;
                  return (
                    <TouchableOpacity
                      key={shortcut.label}
                      onPress={() => {
                        setMinPrice(shortcut.min);
                        setMaxPrice(shortcut.max);
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: isMatch ? '#0ea5e9' : colors.border,
                        backgroundColor: isMatch
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.15)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isMatch ? '700' : '500',
                          color: isMatch ? '#0ea5e9' : colors.textMuted,
                        }}
                      >
                        {shortcut.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 3. Tipo de Imóvel */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Tipo de Imóvel
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                {[
                  'Todos',
                  'Apartamento',
                  'Casa',
                  'Condomínio',
                  'Cobertura',
                  'Terreno',
                  'Comercial',
                  'Rural',
                ].map((type) => {
                  const isSelected = selectedType.toLowerCase() === type.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSelectedType(type)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0ea5e9' : colors.border,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 4. Quartos Mínimos */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Quartos
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {[
                  { value: 0, label: 'Todos' },
                  { value: 1, label: '1+' },
                  { value: 2, label: '2+' },
                  { value: 3, label: '3+' },
                  { value: 4, label: '4+' },
                ].map((opt) => {
                  const isSelected = minBedrooms === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setMinBedrooms(opt.value)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0ea5e9' : colors.border,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 5. Suítes Mínimas */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Suítes
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {[
                  { value: 0, label: 'Todos' },
                  { value: 1, label: '1+' },
                  { value: 2, label: '2+' },
                  { value: 3, label: '3+' },
                ].map((opt) => {
                  const isSelected = minSuites === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setMinSuites(opt.value)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0ea5e9' : colors.border,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 6. Banheiros Mínimos */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Banheiros
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {[
                  { value: 0, label: 'Todos' },
                  { value: 1, label: '1+' },
                  { value: 2, label: '2+' },
                  { value: 3, label: '3+' },
                ].map((opt) => {
                  const isSelected = minBathrooms === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setMinBathrooms(opt.value)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0ea5e9' : colors.border,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 7. Vagas de Garagem */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Vagas de Garagem
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {[
                  { value: 0, label: 'Todos' },
                  { value: 1, label: '1+' },
                  { value: 2, label: '2+' },
                  { value: 3, label: '3+' },
                ].map((opt) => {
                  const isSelected = minGarage === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setMinGarage(opt.value)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0ea5e9' : colors.border,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 8. Cidades */}
              {availableCities.length > 0 && (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                    Cidade
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCity('');
                        setSelectedNeighborhood('');
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selectedCity === '' ? '#0ea5e9' : colors.border,
                        backgroundColor: selectedCity === ''
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: selectedCity === '' ? '700' : '500',
                          color: selectedCity === '' ? '#0ea5e9' : colors.text,
                        }}
                      >
                        Todas
                      </Text>
                    </TouchableOpacity>
                    {availableCities.map((city) => {
                      const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={city}
                          onPress={() => {
                            setSelectedCity(isSelected ? '' : city);
                            setSelectedNeighborhood('');
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSelected ? '#0ea5e9' : colors.border,
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(14, 165, 233, 0.2)'
                                : '#e0f2fe'
                              : colors.mutedSurface,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected ? '#0ea5e9' : colors.text,
                            }}
                          >
                            {city}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* 9. Bairros */}
              {availableNeighborhoods.length > 0 && (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                    Bairro
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                    <TouchableOpacity
                      onPress={() => setSelectedNeighborhood('')}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selectedNeighborhood === '' ? '#0ea5e9' : colors.border,
                        backgroundColor: selectedNeighborhood === ''
                          ? isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : '#e0f2fe'
                          : colors.mutedSurface,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: selectedNeighborhood === '' ? '700' : '500',
                          color: selectedNeighborhood === '' ? '#0ea5e9' : colors.text,
                        }}
                      >
                        Todos
                      </Text>
                    </TouchableOpacity>
                    {availableNeighborhoods.map((neigh) => {
                      const isSelected = selectedNeighborhood.toLowerCase() === neigh.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={neigh}
                          onPress={() => setSelectedNeighborhood(isSelected ? '' : neigh)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSelected ? '#0ea5e9' : colors.border,
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(14, 165, 233, 0.2)'
                                : '#e0f2fe'
                              : colors.mutedSurface,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected ? '#0ea5e9' : colors.text,
                            }}
                          >
                            {neigh}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Rodapé Fixo */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <TouchableOpacity
                onPress={handleResetFilters}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: colors.mutedSurface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  Limpar Filtros
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowFiltersModal(false)}
                style={{
                  flex: 2,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: '#0ea5e9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                  Ver {filteredProperties.length} {filteredProperties.length === 1 ? 'imóvel' : 'imóveis'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
