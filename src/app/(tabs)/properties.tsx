import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bath,
  Bed,
  Building2,
  Car,
  MapPin,
  Maximize2,
  Share2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Property } from '../../types';

const LISTING_FILTERS = ['Todos', 'Venda', 'Locação', 'Temporada'];

export default function PropertiesScreen() {
  const { profile, company } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Todos');

  const fetchProperties = useCallback(async () => {
    try {
      let query = supabase
        .from('properties')
        .select(`
          id, title, slug, price, type, listing_type, status, city, neighborhood, state,
          bedrooms, bathrooms, area, garage, images, featured, created_at, agent_id
        `)
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

  const filteredProperties = properties.filter((item) => {
    if (selectedFilter === 'Todos') return true;
    if (selectedFilter === 'Venda') return item.listing_type === 'sale';
    if (selectedFilter === 'Locação') return item.listing_type === 'rent';
    if (selectedFilter === 'Temporada') return item.listing_type === 'temporada';
    return true;
  });

  const handleShare = async (item: Property) => {
    try {
      const publicDomain = company?.domain || `${company?.subdomain || 'app'}.elevatiovendas.com.br`;
      const url = `https://${publicDomain}/imovel/${item.slug}`;
      await Share.share({
        title: item.title,
        message: `Confira este imóvel: ${item.title}\nValor: ${Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}\nLink: ${url}`,
        url,
      });
    } catch (err) {
      console.warn('Erro ao compartilhar imóvel:', err);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 56 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: colors.text }}>
          Catálogo de Imóveis
        </Text>
        <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
          {filteredProperties.length} imóveis cadastrados
        </Text>
      </View>

      {/* Filtros em Pílulas */}
      <View style={{ marginBottom: 12 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={LISTING_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedFilter(item)}
                style={{
                  backgroundColor: isSelected ? '#0ea5e9' : colors.card,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isSelected ? '#0ea5e9' : colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: isSelected ? 'Sora_700Bold' : 'Sora_600SemiBold',
                    fontSize: 12,
                    color: isSelected ? '#ffffff' : colors.textMuted,
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Lista de Imóveis */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0ea5e9" size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Building2 size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 16, color: colors.text }}>
                Nenhum imóvel disponível
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const coverImage =
              item.images && item.images.length > 0
                ? item.images[0]
                : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800';

            const priceFormatted = Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(item.price);

            return (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {/* Imagem de Capa com Badges */}
                <View style={{ position: 'relative', height: 180, width: '100%' }}>
                  <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} />
                  <View
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      backgroundColor: 'rgba(8, 47, 73, 0.85)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 11, color: '#38bdf8' }}>
                      {item.listing_type === 'rent'
                        ? 'LOCAÇÃO'
                        : item.listing_type === 'temporada'
                        ? 'TEMPORADA'
                        : 'VENDA'}
                    </Text>
                  </View>

                  <View
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor:
                        item.status === 'Disponível'
                          ? 'rgba(16, 185, 129, 0.9)'
                          : 'rgba(244, 63, 94, 0.9)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 11, color: '#ffffff' }}>
                      {item.status || 'Disponível'}
                    </Text>
                  </View>
                </View>

                {/* Corpo do Card */}
                <View style={{ padding: 16 }}>
                  {/* Localização */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <MapPin size={13} color={colors.textMuted} />
                    <Text
                      style={{
                        fontFamily: 'Sora_400Regular',
                        fontSize: 12,
                        color: colors.textMuted,
                      }}
                      numberOfLines={1}
                    >
                      {item.neighborhood ? `${item.neighborhood}, ${item.city}` : item.city}
                    </Text>
                  </View>

                  {/* Título do Imóvel */}
                  <Text
                    style={{
                      fontFamily: 'Sora_700Bold',
                      fontSize: 16,
                      color: colors.text,
                      lineHeight: 22,
                    }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>

                  {/* Preço de Destaque */}
                  <Text
                    style={{
                      fontFamily: 'Sora_800ExtraBold',
                      fontSize: 20,
                      color: '#0ea5e9',
                      marginTop: 6,
                    }}
                  >
                    {priceFormatted}
                  </Text>

                  {/* Atributos (Quartos, Banheiros, Vagas, Área) */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 14,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Bed size={15} color={colors.textMuted} />
                      <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text }}>
                        {item.bedrooms || 0} qts
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Bath size={15} color={colors.textMuted} />
                      <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text }}>
                        {item.bathrooms || 0} banh
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Car size={15} color={colors.textMuted} />
                      <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text }}>
                        {item.garage || 0} vagas
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Maximize2 size={15} color={colors.textMuted} />
                      <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text }}>
                        {item.area || 0} m²
                      </Text>
                    </View>
                  </View>

                  {/* Botão de Compartilhamento */}
                  <TouchableOpacity
                    onPress={() => handleShare(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      borderRadius: 12,
                      height: 42,
                      marginTop: 14,
                      gap: 6,
                      borderWidth: 1,
                      borderColor: 'rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    <Share2 size={16} color="#0ea5e9" />
                    <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 13, color: '#0ea5e9' }}>
                      Compartilhar no WhatsApp
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
