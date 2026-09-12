import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// Providers must be enabled in Supabase Dashboard > Authentication > Providers,
// and configured with credentials from the Google Cloud / Apple developer consoles
// before these will work end to end.
// OAUTH is using OpenID Connect 
// Claude: 
// OpenID Connect (OIDC) is a thin identity layer on top of OAuth 2.0 that adds 
// a signed ID token with verified claims (sub, email, etc.) — that's what 
// actually authenticates the user.
export type OAuthProvider = 'google' | 'apple';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signInWithEmail: AuthContextValue['signInWithEmail'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail: AuthContextValue['signUpWithEmail'] = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithOAuth: AuthContextValue['signInWithOAuth'] = async (provider) => {
    const redirectTo = Linking.createURL('/auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error || !data?.url) {
      return { error: error?.message ?? 'Could not start sign in.' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success' || !result.url) {
      return result.type === 'cancel' ? { error: null } : { error: 'Sign in was not completed.' };
    }

    const { queryParams } = Linking.parse(result.url);
    const params = queryParams ?? {};
    if (params.error) {
      return { error: String(params.error_description ?? params.error) };
    }

    const code = params.code as string | undefined;
    if (!code) {
      return { error: 'Sign in did not return a valid authorization code.' };
    }

    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    return { error: sessionError?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, signInWithEmail, signUpWithEmail, signInWithOAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
