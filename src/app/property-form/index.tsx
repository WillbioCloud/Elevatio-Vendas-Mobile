import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Home,
  Image as ImageIcon,
  Key,
  MapPin,
  Plus,
  Star,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

const PROPERTY_TYPES = [
  'Apartamento',
  'Casa',
  'Casa em Condomínio',
  'Sobrado',
  'Cobertura',
  'Terreno / Lote',
  'Comercial',
  'Sala Comercial',
  'Rural / Chácara',
  'Studio / Flat',
];

const PROPERTY_STATUSES = [
  'Disponível',
  'Reservado',
  'Vendido',
  'Alugado',
  'Inativo',
];

const COMMON_AMENITIES = [
  'Piscina',
  'Churrasqueira',
  'Varanda Gourmet',
  'Academia',
  'Elevador',
  'Portaria 24h',
  'Ar Condicionado',
  'Mobiliado',
  'Aceita Pet',
  'Energia Solar',
  'Salão de Festas',
  'Playground',
  'Segurança 24h',
];

export default function PropertyFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [loadingProperty, setLoadingProperty] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  // STEP 1: Negócio & Valores
  const [listingType, setListingType] = useState<'sale' | 'rent' | 'seasonal'>('sale');
  const [propertyType, setPropertyType] = useState('Apartamento');
  const [propertyStatus, setPropertyStatus] = useState('Disponível');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condominium, setCondominium] = useState('');
  const [iptu, setIptu] = useState('');

  // Campos específicos de Temporada
  const [dailyRate, setDailyRate] = useState('');
  const [cleaningFee, setCleaningFee] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [minNights, setMinNights] = useState('');

  // STEP 2: Detalhes & Endereço
  const [bedrooms, setBedrooms] = useState('2');
  const [suites, setSuites] = useState('1');
  const [bathrooms, setBathrooms] = useState('2');
  const [garages, setGarages] = useState('1');
  const [area, setArea] = useState('');
  const [builtArea, setBuiltArea] = useState('');
  const [landArea, setLandArea] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [keyLocation, setKeyLocation] = useState('');
  const [keyStatus, setKeyStatus] = useState<'agency' | 'broker' | 'client' | 'owner'>('agency');
  const [fetchingCep, setFetchingCep] = useState(false);

  // STEP 3: Dados Confidenciais do Proprietário
  const [ownerName, setOwnerName] = useState('');
  const [ownerCpfCnpj, setOwnerCpfCnpj] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPix, setOwnerPix] = useState('');
  const [commissionAgreed, setCommissionAgreed] = useState('6%');
  const [hasExclusivity, setHasExclusivity] = useState(false);
  const [hasIntermediation, setHasIntermediation] = useState(false);

  // STEP 4: Mídia & Fotos
  const [images, setImages] = useState<string[]>([]);

  // Carrega dados se for Edição
  useEffect(() => {
    if (id) {
      const loadProperty = async () => {
        try {
          setLoadingProperty(true);
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          if (data) {
            setTitle(data.title || '');
            setDescription(data.description || '');
            setListingType(data.listing_type === 'temporada' ? 'seasonal' : (data.listing_type as any) || 'sale');
            setPropertyType(data.type || 'Apartamento');
            setPropertyStatus(data.status || 'Disponível');
            setPrice(data.price ? String(data.price) : '');
            setCondominium(data.condominium ? String(data.condominium) : '');
            setIptu(data.iptu ? String(data.iptu) : '');

            // Temporada
            setDailyRate(data.daily_rate ? String(data.daily_rate) : '');
            setCleaningFee(data.cleaning_fee ? String(data.cleaning_fee) : '');
            setMaxGuests(data.max_guests ? String(data.max_guests) : '');

            // Detalhes
            setBedrooms(data.bedrooms !== null ? String(data.bedrooms) : '2');
            setSuites(data.suites !== null ? String(data.suites) : '1');
            setBathrooms(data.bathrooms !== null ? String(data.bathrooms) : '2');
            setGarages(data.garage !== null ? String(data.garage) : '1');
            setArea(data.area ? String(data.area) : '');
            setBuiltArea(data.built_area ? String(data.built_area) : '');

            // Endereço
            setCep(data.zip_code || data.cep || '');
            setStreet(data.street || data.address || '');
            setNeighborhood(data.neighborhood || '');
            setCity(data.city || '');
            setState(data.state || 'SP');
            setSelectedFeatures(data.features || []);
            setKeyStatus((data.key_status as any) || 'agency');

            // Proprietário
            setOwnerName(data.owner_name || '');
            setOwnerCpfCnpj(data.owner_document || data.owner_cpf_cnpj || '');
            setOwnerPhone(data.owner_phone || '');
            setOwnerEmail(data.owner_email || '');
            setOwnerPix(data.owner_pix_key || data.owner_pix || '');
            setCommissionAgreed(data.commission_percentage ? `${data.commission_percentage}%` : '6%');
            setHasExclusivity(!!data.has_exclusivity);
            setHasIntermediation(!!data.has_intermediation_signed);

            // Fotos
            setImages(data.images || []);
          }
        } catch (err: any) {
          Alert.alert('Erro ao carregar imóvel', err.message);
          router.back();
        } finally {
          setLoadingProperty(false);
        }
      };

      loadProperty();
    }
  }, [id]);

  // CEP Auto-Fetch via ViaCEP
  const handleCepChange = async (text: string) => {
    const cleanCep = text.replace(/\D/g, '');
    let formatted = cleanCep;
    if (cleanCep.length > 5) {
      formatted = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`;
    }
    setCep(formatted);

    if (cleanCep.length === 8) {
      try {
        setFetchingCep(true);
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || 'SP');
        }
      } catch (err) {
        console.warn('Erro ao consultar CEP:', err);
      } finally {
        setFetchingCep(false);
      }
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  // Câmera / Galeria
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para anexar fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((a) => a.uri);
        setImages((prev) => [...prev, ...newUris]);
      }
    } catch (err: any) {
      Alert.alert('Erro ao selecionar fotos', err.message);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (err: any) {
      Alert.alert('Erro ao abrir câmera', err.message);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
  };

  // Validação por Etapa
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        Alert.alert('Título Obrigatório', 'Informe um título descritivo para o imóvel.');
        return;
      }
      const numPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(numPrice) || numPrice <= 0) {
        Alert.alert('Preço Obrigatório', 'Informe um valor válido para o imóvel.');
        return;
      }
    } else if (currentStep === 2) {
      if (!city.trim() || !neighborhood.trim()) {
        Alert.alert('Localização Obrigatória', 'Por favor, informe ao menos a cidade e o bairro.');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  // Salvar Imóvel Completo
  const handleSaveProperty = async () => {
    if (!user || !profile?.company_id) {
      Alert.alert('Erro de Sessão', 'Usuário não vinculado a uma empresa.');
      return;
    }

    try {
      setSubmitting(true);
      const numPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const numCondominium = condominium ? parseFloat(condominium.replace(/[^\d.,]/g, '').replace(',', '.')) : 0;
      const numIptu = iptu ? parseFloat(iptu.replace(/[^\d.,]/g, '').replace(',', '.')) : 0;
      const numArea = parseFloat(area.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const numBuiltArea = builtArea ? parseFloat(builtArea.replace(/[^\d.,]/g, '').replace(',', '.')) : null;

      const numDailyRate = dailyRate ? parseFloat(dailyRate.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
      const numCleaningFee = cleaningFee ? parseFloat(cleaningFee.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
      const numMaxGuests = maxGuests ? parseInt(maxGuests, 10) : null;

      // Cria slug amigável
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

      // Upload de imagens locais para Supabase Storage
      const finalImageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const uri = images[i];
        if (uri.startsWith('http')) {
          finalImageUrls.push(uri);
        } else {
          try {
            const fileName = `${profile.company_id}/${Date.now()}_${i}.jpg`;
            const formData = new FormData();
            formData.append('file', {
              uri,
              name: fileName,
              type: 'image/jpeg',
            } as any);

            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('properties')
              .upload(fileName, formData as any, { contentType: 'image/jpeg' });

            if (!uploadErr && uploadData) {
              const { data: urlData } = supabase.storage
                .from('properties')
                .getPublicUrl(uploadData.path);
              finalImageUrls.push(urlData.publicUrl);
            } else {
              finalImageUrls.push(uri);
            }
          } catch {
            finalImageUrls.push(uri);
          }
        }
      }

      // Payload estrito utilizando as colunas REAIS do Supabase (NUNCA condo_fee ou iptu_fee)
      const payload: any = {
        company_id: profile.company_id,
        agent_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        type: propertyType,
        listing_type: listingType === 'seasonal' ? 'temporada' : listingType,
        status: propertyStatus,
        price: numPrice,
        condominium: numCondominium, // Coluna real
        iptu: numIptu,               // Coluna real
        bedrooms: parseInt(bedrooms, 10) || 0,
        suites: suites ? parseInt(suites, 10) : 0,
        bathrooms: parseInt(bathrooms, 10) || 1,
        garage: parseInt(garages, 10) || 0,
        area: numArea,
        built_area: numBuiltArea,
        zip_code: cep.replace(/\D/g, '') || null,
        address: street.trim() || null,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.toUpperCase(),
        features: selectedFeatures,
        key_status: keyStatus,
        owner_name: ownerName.trim() || null,
        owner_document: ownerCpfCnpj.trim() || null,
        owner_phone: ownerPhone.replace(/\D/g, '') || null,
        owner_email: ownerEmail.trim() || null,
        owner_pix_key: ownerPix.trim() || null,
        commission_percentage: parseFloat(commissionAgreed.replace('%', '').replace(',', '.')) || 5,
        has_exclusivity: hasExclusivity,
        has_intermediation_signed: hasIntermediation,
        images: finalImageUrls,
      };

      if (listingType === 'seasonal') {
        payload.daily_rate = numDailyRate;
        payload.cleaning_fee = numCleaningFee;
        payload.max_guests = numMaxGuests;
      }

      if (isEditing) {
        const { error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
        Alert.alert('Sucesso! 🏡', 'Imóvel atualizado com sucesso.');
      } else {
        payload.slug = slug;
        payload.created_at = new Date().toISOString();
        payload.featured = false;

        const { error } = await supabase
          .from('properties')
          .insert(payload);

        if (error) throw error;

        // Notificação
        await supabase.from('notifications').insert({
          company_id: profile.company_id,
          user_id: user.id,
          title: 'Novo Imóvel Captado',
          message: `${profile.name || 'Corretor'} cadastrou o imóvel "${title.trim()}".`,
          type: 'property_created',
          read: false,
        });

        Alert.alert('Sucesso! 🏡', 'Imóvel cadastrado com sucesso.');
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Erro ao salvar imóvel', err.message || 'Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProperty) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 12 }}>
          Carregando dados do imóvel...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* Header com Voltar e Indicador de Etapas */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (currentStep > 1) setCurrentStep((prev) => prev - 1);
            else router.back();
          }}
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
        >
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
            {isEditing ? 'Editar Imóvel' : 'Nova Captação'}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            Etapa {currentStep} de 4
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={{ width: 38, alignItems: 'center' }}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Barra de Progresso do Wizard */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 16 }}>
        {[1, 2, 3, 4].map((step) => {
          const isDone = currentStep >= step;
          return (
            <View
              key={step}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDone ? '#0ea5e9' : colors.mutedSurface,
              }}
            />
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          {/* ETAPA 1: NEGÓCIO & VALORES */}
          {currentStep === 1 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                1. Negócio, Categoria e Valores
              </Text>

              {/* Finalidade */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                Modalidade *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {[
                  { id: 'sale' as const, label: 'Venda' },
                  { id: 'rent' as const, label: 'Locação' },
                  { id: 'seasonal' as const, label: 'Temporada' },
                ].map((type) => {
                  const isSel = listingType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => setListingType(type.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSel
                          ? isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe'
                          : colors.card,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: isSel ? '#0ea5e9' : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSel ? '700' : '500',
                          color: isSel ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status do Imóvel */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                Status do Imóvel *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
              >
                {PROPERTY_STATUSES.map((st) => {
                  const isSel = propertyStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setPropertyStatus(st)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: isSel
                          ? isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'
                          : colors.card,
                        borderWidth: 1,
                        borderColor: isSel ? '#10b981' : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSel ? '700' : '500',
                          color: isSel ? '#10b981' : colors.text,
                        }}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Tipo de Imóvel */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                Tipo do Imóvel *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
              >
                {PROPERTY_TYPES.map((pt) => {
                  const isSel = propertyType === pt;
                  return (
                    <TouchableOpacity
                      key={pt}
                      onPress={() => setPropertyType(pt)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: isSel
                          ? isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe'
                          : colors.card,
                        borderWidth: 1,
                        borderColor: isSel ? '#0ea5e9' : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSel ? '700' : '500',
                          color: isSel ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {pt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Título */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                Título do Anúncio *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Apartamento 3 Quartos com Varanda Gourmet no Centro"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 14,
                }}
              />

              {/* Preço Principal */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                Preço Principal (R$) *
              </Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="Ex: 650000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 14,
                }}
              />

              {/* Condomínio e IPTU */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                    Condomínio (R$/mês)
                  </Text>
                  <TextInput
                    value={condominium}
                    onChangeText={setCondominium}
                    placeholder="Ex: 750"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      fontSize: 14,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                    IPTU (R$/ano)
                  </Text>
                  <TextInput
                    value={iptu}
                    onChangeText={setIptu}
                    placeholder="Ex: 1800"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      fontSize: 14,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
              </View>

              {/* Campos específicos se for Temporada */}
              {listingType === 'seasonal' && (
                <View
                  style={{
                    backgroundColor: colors.mutedSurface,
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0ea5e9', marginBottom: 10 }}>
                    Parâmetros de Temporada
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                        Diária (R$)
                      </Text>
                      <TextInput
                        value={dailyRate}
                        onChangeText={setDailyRate}
                        placeholder="Ex: 450"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 8,
                          padding: 10,
                          color: colors.text,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                        Taxa Limpeza (R$)
                      </Text>
                      <TextInput
                        value={cleaningFee}
                        onChangeText={setCleaningFee}
                        placeholder="Ex: 180"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 8,
                          padding: 10,
                          color: colors.text,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                        Máx Hóspedes
                      </Text>
                      <TextInput
                        value={maxGuests}
                        onChangeText={setMaxGuests}
                        placeholder="Ex: 6"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 8,
                          padding: 10,
                          color: colors.text,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                        Mín Noites
                      </Text>
                      <TextInput
                        value={minNights}
                        onChangeText={setMinNights}
                        placeholder="Ex: 2"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 8,
                          padding: 10,
                          color: colors.text,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ETAPA 2: DETALHES & ENDEREÇO */}
          {currentStep === 2 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                2. Características, Cômodos e Endereço
              </Text>

              {/* Grid de Cômodos */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Quartos</Text>
                  <TextInput
                    value={bedrooms}
                    onChangeText={setBedrooms}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                      textAlign: 'center',
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Suítes</Text>
                  <TextInput
                    value={suites}
                    onChangeText={setSuites}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                      textAlign: 'center',
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Banheiros</Text>
                  <TextInput
                    value={bathrooms}
                    onChangeText={setBathrooms}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                      textAlign: 'center',
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Vagas</Text>
                  <TextInput
                    value={garages}
                    onChangeText={setGarages}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                      textAlign: 'center',
                    }}
                  />
                </View>
              </View>

              {/* Áreas: Útil, Construída, Terreno */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Área Útil (m²)</Text>
                  <TextInput
                    value={area}
                    onChangeText={setArea}
                    placeholder="95"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Construída (m²)</Text>
                  <TextInput
                    value={builtArea}
                    onChangeText={setBuiltArea}
                    placeholder="85"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Terreno (m²)</Text>
                  <TextInput
                    value={landArea}
                    onChangeText={setLandArea}
                    placeholder="250"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
              </View>

              {/* CEP com Auto-busca */}
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>CEP</Text>
                  {fetchingCep && <ActivityIndicator size="small" color="#0ea5e9" />}
                </View>
                <TextInput
                  value={cep}
                  onChangeText={handleCepChange}
                  placeholder="00000-000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={9}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    padding: 10,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </View>

              {/* Logradouro, Número e Complemento */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Rua / Avenida</Text>
                  <TextInput
                    value={street}
                    onChangeText={setStreet}
                    placeholder="Ex: Rua das Palmeiras"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Número</Text>
                  <TextInput
                    value={number}
                    onChangeText={setNumber}
                    placeholder="120"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
              </View>

              {/* Bairro, Cidade e UF */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Bairro *</Text>
                  <TextInput
                    value={neighborhood}
                    onChangeText={setNeighborhood}
                    placeholder="Ex: Centro"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Cidade *</Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="Ex: São Paulo"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>UF</Text>
                  <TextInput
                    value={state}
                    onChangeText={setState}
                    maxLength={2}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                      textAlign: 'center',
                    }}
                  />
                </View>
              </View>

              {/* Controle de Chaves */}
              <View
                style={{
                  backgroundColor: colors.mutedSurface,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Key size={14} color="#0ea5e9" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    Controle e Status da Chave
                  </Text>
                </View>

                <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
                  Onde a chave física está localizada atualmente:
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { key: 'agency', label: 'Na Imobiliária' },
                    { key: 'broker', label: 'Com Corretor' },
                    { key: 'client', label: 'Com Cliente' },
                    { key: 'owner', label: 'Com Proprietário' },
                  ].map((item) => {
                    const isSelected = keyStatus === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => setKeyStatus(item.key as any)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isSelected ? '#0ea5e9' : colors.border,
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(14, 165, 233, 0.2)'
                              : '#e0f2fe'
                            : colors.card,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: isSelected ? '700' : '500',
                            color: isSelected ? '#0ea5e9' : colors.text,
                          }}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Comodidades (Features) */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Comodidades e Lazer
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {COMMON_AMENITIES.map((feature) => {
                  const isSel = selectedFeatures.includes(feature);
                  return (
                    <TouchableOpacity
                      key={feature}
                      onPress={() => toggleFeature(feature)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: isSel
                          ? isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe'
                          : colors.card,
                        borderWidth: 1,
                        borderColor: isSel ? '#0ea5e9' : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isSel ? '700' : '500',
                          color: isSel ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {feature}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Descrição */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                Descrição Detalhada
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Destaque acabamentos, posição solar, proximidades..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  padding: 10,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 70,
                  textAlignVertical: 'top',
                }}
              />
            </View>
          )}

          {/* ETAPA 3: DADOS CONFIDENCIAIS DO PROPRIETÁRIO */}
          {currentStep === 3 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                3. Dados Confidenciais do Proprietário
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
                Apenas corretores e gestores da imobiliária têm acesso a estes dados.
              </Text>

              {/* Nome Proprietário */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Nome do Proprietário</Text>
              <TextInput
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Ex: João da Silva"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  padding: 10,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 12,
                }}
              />

              {/* CPF / CNPJ */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>CPF ou CNPJ</Text>
              <TextInput
                value={ownerCpfCnpj}
                onChangeText={setOwnerCpfCnpj}
                placeholder="000.000.000-00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  padding: 10,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 12,
                }}
              />

              {/* WhatsApp e E-mail */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>WhatsApp</Text>
                  <TextInput
                    value={ownerPhone}
                    onChangeText={setOwnerPhone}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>E-mail</Text>
                  <TextInput
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    placeholder="dono@email.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>
              </View>

              {/* Chave PIX e Comissão Acordada */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Chave PIX</Text>
                  <TextInput
                    value={ownerPix}
                    onChangeText={setOwnerPix}
                    placeholder="Chave para repasse"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Comissão</Text>
                  <TextInput
                    value={commissionAgreed}
                    onChangeText={setCommissionAgreed}
                    placeholder="Ex: 6%"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 10,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                      textAlign: 'center',
                    }}
                  />
                </View>
              </View>

              {/* Switches: Exclusividade e Intermediação */}
              <View style={{ gap: 10, marginBottom: 14 }}>
                <TouchableOpacity
                  onPress={() => setHasExclusivity(!hasExclusivity)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: colors.card,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    Possui Contrato de Exclusividade
                  </Text>
                  <Switch
                    value={hasExclusivity}
                    onValueChange={setHasExclusivity}
                    trackColor={{ false: colors.border, true: '#0ea5e9' }}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setHasIntermediation(!hasIntermediation)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: colors.card,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                      Termo de Intermediação Assinado
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>
                      Selo de regularidade jurídica no catálogo
                    </Text>
                  </View>
                  <Switch
                    value={hasIntermediation}
                    onValueChange={setHasIntermediation}
                    trackColor={{ false: colors.border, true: '#10b981' }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ETAPA 4: FOTOS & MÍDIA */}
          {currentStep === 4 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                4. Fotos e Galeria do Imóvel
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
                Tire fotos na vistoria ou anexe da galeria ({images.length} fotos anexadas).
              </Text>

              {/* Botões Câmera e Galeria */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: '#0ea5e9',
                    paddingVertical: 12,
                    borderRadius: 12,
                  }}
                  activeOpacity={0.8}
                >
                  <Camera size={18} color="#ffffff" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>Tirar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePickFromGallery}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: colors.card,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  activeOpacity={0.8}
                >
                  <ImageIcon size={18} color={colors.text} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Da Galeria</Text>
                </TouchableOpacity>
              </View>

              {/* Grid de Fotos com Definir Capa e Remover */}
              {images.length === 0 ? (
                <View
                  style={{
                    borderWidth: 2,
                    borderColor: colors.border,
                    borderStyle: 'dashed',
                    borderRadius: 16,
                    padding: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Upload size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    Nenhuma foto anexada
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                    Fotos de boa qualidade aumentam a velocidade de fechamento.
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                  {images.map((uri, index) => (
                    <View
                      key={index}
                      style={{
                        width: '48%',
                        height: 130,
                        borderRadius: 12,
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: colors.card,
                      }}
                    >
                      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />

                      {/* Botão Remover */}
                      <TouchableOpacity
                        onPress={() => handleRemoveImage(index)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          backgroundColor: 'rgba(0, 0, 0, 0.65)',
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={13} color="#ffffff" />
                      </TouchableOpacity>

                      {/* Definir Capa / Indicador Capa */}
                      {index === 0 ? (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            left: 6,
                            backgroundColor: '#0ea5e9',
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>★ CAPA</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleSetCover(index)}
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            left: 6,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '600', color: '#ffffff' }}>Definir Capa</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Navegação Inferior */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {currentStep > 1 && (
              <TouchableOpacity
                onPress={() => setCurrentStep((prev) => prev - 1)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Voltar</Text>
              </TouchableOpacity>
            )}

            {currentStep < 4 ? (
              <TouchableOpacity
                onPress={handleNextStep}
                style={{
                  flex: 2,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: '#0ea5e9',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Continuar</Text>
                <ArrowRight size={16} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSaveProperty}
                disabled={submitting}
                style={{
                  flex: 2,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: '#10b981',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#ffffff" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                      {isEditing ? 'Atualizar Imóvel' : 'Salvar Imóvel'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
