import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  MapPin,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

const PROPERTY_TYPES = [
  'Apartamento',
  'Casa',
  'Sobrado',
  'Cobertura',
  'Terreno / Lote',
  'Comercial',
  'Sala Comercial',
  'Chácara / Sítio',
];

const COMMON_AMENITIES = [
  'Piscina',
  'Churrasqueira',
  'Varanda Gourmet',
  'Academia',
  'Elevador',
  'Portaria 24h',
  'Ar Condicionado',
  'Salão de Festas',
  'Playground',
  'Segurança 24h',
];

export default function PropertyFormScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // STEP 1: Básico
  const [listingType, setListingType] = useState<'sale' | 'rent' | 'temporada'>('sale');
  const [propertyType, setPropertyType] = useState('Apartamento');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [condoFee, setCondoFee] = useState('');
  const [iptuFee, setIptuFee] = useState('');

  // STEP 2: Detalhes & Endereço
  const [bedrooms, setBedrooms] = useState('2');
  const [suites, setSuites] = useState('1');
  const [bathrooms, setBathrooms] = useState('2');
  const [garages, setGarages] = useState('1');
  const [area, setArea] = useState('');
  const [builtArea, setBuiltArea] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [description, setDescription] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [fetchingCep, setFetchingCep] = useState(false);

  // STEP 3: Dados Confidenciais do Proprietário
  const [ownerName, setOwnerName] = useState('');
  const [ownerCpfCnpj, setOwnerCpfCnpj] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPixKey, setOwnerPixKey] = useState('');
  const [hasIntermediation, setHasIntermediation] = useState(false);

  // STEP 4: Mídia & Fotos
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  // Câmera / Galeria
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para anexar fotos do imóvel.');
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
      Alert.alert('Erro ao selecionar imagem', err.message);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera para fotografar o imóvel.');
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
      const numCondo = condoFee ? parseFloat(condoFee.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
      const numIptu = iptuFee ? parseFloat(iptuFee.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
      const numArea = parseFloat(area.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const numBuiltArea = builtArea ? parseFloat(builtArea.replace(/[^\d.,]/g, '').replace(',', '.')) : null;

      // Cria slug amigável
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

      // Upload de imagens para Supabase Storage se houver imagens locais
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
              // Se falhar upload no storage, mantém o uri
              finalImageUrls.push(uri);
            }
          } catch {
            finalImageUrls.push(uri);
          }
        }
      }

      const payload = {
        company_id: profile.company_id,
        agent_id: user.id,
        title: title.trim(),
        slug,
        type: propertyType,
        listing_type: listingType,
        status: 'Disponível',
        price: numPrice,
        condo_fee: numCondo,
        iptu_fee: numIptu,
        bedrooms: parseInt(bedrooms, 10) || 0,
        suites: suites ? parseInt(suites, 10) : 0,
        bathrooms: parseInt(bathrooms, 10) || 1,
        garage: parseInt(garages, 10) || 0,
        area: numArea,
        built_area: numBuiltArea,
        zip_code: cep.replace(/\D/g, '') || null,
        street: street.trim() || null,
        number: number.trim() || null,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.toUpperCase(),
        description: description.trim() || null,
        amenities: selectedAmenities,
        owner_name: ownerName.trim() || null,
        owner_cpf_cnpj: ownerCpfCnpj.trim() || null,
        owner_phone: ownerPhone.replace(/\D/g, '') || null,
        owner_email: ownerEmail.trim() || null,
        owner_pix_key: ownerPixKey.trim() || null,
        has_intermediation_signed: hasIntermediation,
        images: finalImageUrls,
        featured: false,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('properties').insert(payload).select().single();
      if (error) throw error;

      // Notificação
      await supabase.from('notifications').insert({
        company_id: profile.company_id,
        user_id: user.id,
        title: 'Novo Imóvel Captado',
        message: `${profile.name || 'Corretor'} captou o imóvel "${title.trim()}".`,
        type: 'property_created',
        read: false,
      });

      Alert.alert('Sucesso! 🏡', 'Imóvel cadastrado com sucesso no catálogo.');
      router.back();
    } catch (err: any) {
      Alert.alert('Erro ao salvar imóvel', err.message || 'Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

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
            Nova Captação
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
          {/* ETAPA 1: BÁSICO */}
          {currentStep === 1 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                1. Tipo de Negócio e Valores
              </Text>

              {/* Modalidade de Anúncio */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                Finalidade *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'sale' as const, label: 'Venda' },
                  { id: 'rent' as const, label: 'Locação' },
                  { id: 'temporada' as const, label: 'Temporada' },
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
                placeholder="Ex: Apartamento 3 Quartos com Varanda no Centro"
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
                Valor do Imóvel (R$) *
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
                    value={condoFee}
                    onChangeText={setCondoFee}
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
                    value={iptuFee}
                    onChangeText={setIptuFee}
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
            </View>
          )}

          {/* ETAPA 2: DETALHES & ENDEREÇO */}
          {currentStep === 2 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                2. Características e Localização
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

              {/* Áreas */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Área Total (m²)</Text>
                  <TextInput
                    value={area}
                    onChangeText={setArea}
                    placeholder="Ex: 95"
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
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Área Útil (m²)</Text>
                  <TextInput
                    value={builtArea}
                    onChangeText={setBuiltArea}
                    placeholder="Ex: 85"
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

              {/* Logradouro e Número */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Rua / Avenida</Text>
                  <TextInput
                    value={street}
                    onChangeText={setStreet}
                    placeholder="Ex: Rua das Flores"
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
                    placeholder="Ex: 120"
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

              {/* Comodidades (Tags) */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Comodidades e Lazer
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {COMMON_AMENITIES.map((amenity) => {
                  const isSel = selectedAmenities.includes(amenity);
                  return (
                    <TouchableOpacity
                      key={amenity}
                      onPress={() => toggleAmenity(amenity)}
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
                        {amenity}
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
                placeholder="Destaque pontos fortes, acabamentos, posição solar..."
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
                Estes dados são visíveis apenas para os corretores e gestores da imobiliária.
              </Text>

              {/* Nome Proprietário */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Nome do Proprietário</Text>
              <TextInput
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Ex: João Silva"
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

              {/* WhatsApp / Telefone */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>WhatsApp do Proprietário</Text>
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
                  marginBottom: 12,
                }}
              />

              {/* E-mail */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>E-mail do Proprietário</Text>
              <TextInput
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                placeholder="proprietario@email.com"
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
                  marginBottom: 12,
                }}
              />

              {/* Chave PIX */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Chave PIX do Proprietário</Text>
              <TextInput
                value={ownerPixKey}
                onChangeText={setOwnerPixKey}
                placeholder="Chave PIX para repasse de locação ou sinal"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  padding: 10,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 16,
                }}
              />

              {/* Checkbox Termo de Intermediação */}
              <TouchableOpacity
                onPress={() => setHasIntermediation(!hasIntermediation)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: colors.card,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: hasIntermediation ? '#10b981' : colors.textMuted,
                    backgroundColor: hasIntermediation ? '#10b981' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {hasIntermediation && <Check size={14} color="#ffffff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    Termo de Intermediação / Autorização Assinada
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Marca o imóvel com selo jurídico regularizado no catálogo.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ETAPA 4: FOTOS & MÍDIA */}
          {currentStep === 4 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                4. Fotos e Galeria do Imóvel
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
                Tire fotos direto da vistoria no local ou anexe da sua galeria ({images.length} fotos).
              </Text>

              {/* Botões de Ação de Mídia */}
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

              {/* Grid de Fotos Anexadas */}
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
                    Nenhuma foto anexada ainda
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                    Fotos de boa qualidade aumentam em até 5x o interesse dos clientes.
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                  {images.map((uri, index) => (
                    <View
                      key={index}
                      style={{
                        width: '48%',
                        height: 120,
                        borderRadius: 12,
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: colors.card,
                      }}
                    >
                      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
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
                      {index === 0 && (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            left: 6,
                            backgroundColor: '#0ea5e9',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#ffffff' }}>CAPA</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Botões de Navegação Inferiores */}
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
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Salvar Imóvel</Text>
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

