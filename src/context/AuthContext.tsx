import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AppUserRole, Company, Profile } from '../types';

export interface UserWithProfile extends User {
  profile?: Profile | null;
  company?: Company | null;
}

interface AuthContextType {
  session: Session | null;
  user: UserWithProfile | null;
  profile: Profile | null;
  company: Company | null;
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
  const [loading, setLoading] = useState(true);

  const fetchProfileAndCompany = async (authUser: User): Promise<UserWithProfile> => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const activeProfile = (profileData as Profile) || null;
      setProfile(activeProfile);

      let activeCompany: Company | null = null;
      if (activeProfile?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, subdomain, domain, plan, plan_status, business_type, logo_url, default_commission, broker_commission, phone, email')
          .eq('id', activeProfile.company_id)
          .maybeSingle();

        activeCompany = (companyData as Company) || null;
      }
      setCompany(activeCompany);

      const combined: UserWithProfile = { ...authUser, profile: activeProfile, company: activeCompany };
      setUser(combined);
      return combined;
    } catch (err) {
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
        console.warn('[Auth] Erro no Supabase signInWithPassword:', error.message, error);
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
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) await fetchProfileAndCompany(s.user);
  };

  const userRole: AppUserRole = profile?.role || 'corretor';
  const isOwner = ['owner', 'super_admin'].includes(userRole);
  const isAdmin = ['owner', 'admin', 'super_admin'].includes(userRole);
  const isManager = ['manager', 'admin', 'owner', 'super_admin'].includes(userRole);
  const isCorretor = userRole === 'corretor';
  const isSoloBroker = company?.business_type === 'solo_broker';

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        company,
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
