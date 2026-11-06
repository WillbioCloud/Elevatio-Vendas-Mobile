import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AppSettings, AppUserRole, Company, Profile } from '../types';
import { getPermissions } from '../lib/permissions';

export interface UserWithProfile extends User {
  profile?: Profile | null;
  company?: Company | null;
}

interface AuthContextType {
  session: Session | null;
  user: UserWithProfile | null;
  profile: Profile | null;
  company: Company | null;
  settings: AppSettings | null;
  permissions: ReturnType<typeof getPermissions>;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isCorretor: boolean;
  isSoloBroker: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: Error | null; user?: UserWithProfile | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndCompany = async (authUser: User): Promise<UserWithProfile> => {
    try {
      // 1. Carrega o perfil completo
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const activeProfile = (profileData as Profile) || null;
      setProfile(activeProfile);

      let activeCompany: Company | null = null;
      let activeSettings: AppSettings | null = null;

      if (activeProfile?.company_id) {
        // 2. Carrega a imobiliária
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', activeProfile.company_id)
          .maybeSingle();

        activeCompany = (companyData as Company) || null;

        // 3. Carrega as configurações da empresa (kanban_config, permissions, route_to_central)
        const { data: settingsData } = await supabase
          .from('settings')
          .select('*')
          .eq('company_id', activeProfile.company_id)
          .maybeSingle();

        activeSettings = (settingsData as AppSettings) || null;
      }

      setCompany(activeCompany);
      setSettings(activeSettings);

      const combined: UserWithProfile = { ...authUser, profile: activeProfile, company: activeCompany };
      setUser(combined);
      return combined;
    } catch (err) {
      console.warn('Erro ao carregar dados do usuário/empresa:', err);
      const fallback: UserWithProfile = { ...authUser, profile: null, company: null };
      setUser(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session: initSession } }) => {
      if (!mounted) return;
      if (initSession?.user) {
        setSession(initSession);
        await fetchProfileAndCompany(initSession.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user) {
        await fetchProfileAndCompany(newSession.user);
      } else {
        setUser(null);
        setProfile(null);
        setCompany(null);
        setSettings(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    try {
      console.log('[Auth] Tentando login para:', email.trim(), captchaToken ? '(com captcha)' : '(sem captcha)');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });

      if (error) {
        console.warn('[Auth] Erro no Supabase signInWithPassword:', error.message);
        return { error: new Error(error.message) };
      }

      if (data.session?.user) {
        console.log('[Auth] Sessão autenticada com sucesso, carregando perfil...');
        setSession(data.session);
        const fullUser = await fetchProfileAndCompany(data.session.user);
        return { error: null, user: fullUser };
      }
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Exceção durante o signIn:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setCompany(null);
      setSettings(null);
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) await fetchProfileAndCompany(s.user);
  };

  const permissions = getPermissions({ profile, company, settings });

  const userRole: AppUserRole = profile?.role || 'corretor';
  const isOwner = permissions.isSuperOrOwner;
  const isAdmin = permissions.isSuperOrOwner || userRole === 'admin';
  const isManager = permissions.isSuperOrOwner || permissions.isManagerOrAdmin;
  const isCorretor = userRole === 'corretor';
  const isSoloBroker = permissions.isSoloBroker;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        company,
        settings,
        permissions,
        loading,
        isOwner,
        isAdmin,
        isManager,
        isCorretor,
        isSoloBroker,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
