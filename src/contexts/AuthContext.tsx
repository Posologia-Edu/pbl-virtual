import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "professor" | "student" | "institution_admin";

interface SubscriptionInfo {
  subscribed: boolean;
  productId: string | null;
  planName: string | null;
  subscriptionEnd: string | null;
  institutionId: string | null;
  maxAiInteractions: number;
  aiScenarioGeneration: boolean;
  peerEvaluationEnabled: boolean;
  badgesEnabled: boolean;
  fullReportsEnabled: boolean;
  whitelabelEnabled: boolean;
  aiInteractionsUsed: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  profile: { full_name: string } | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  isAdmin: boolean;
  isProfessor: boolean;
  isStudent: boolean;
  isInstitutionAdmin: boolean;
}

const defaultSubscription: SubscriptionInfo = {
  subscribed: false,
  productId: null,
  planName: null,
  subscriptionEnd: null,
  institutionId: null,
  maxAiInteractions: 50,
  aiScenarioGeneration: false,
  peerEvaluationEnabled: false,
  badgesEnabled: false,
  fullReportsEnabled: false,
  whitelabelEnabled: false,
  aiInteractionsUsed: 0,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSubscription);
  const [initialSessionLoaded, setInitialSessionLoaded] = useState(false);

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
    ]);
    if (rolesRes.data) setRoles(rolesRes.data.map((r: any) => r.role as AppRole));
    if (profileRes.data) setProfile(profileRes.data);
  };

  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(defaultSubscription);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setSubscription({
        subscribed: data?.subscribed ?? false,
        productId: data?.product_id ?? null,
        planName: data?.plan_name ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        institutionId: data?.institution_id ?? null,
        maxAiInteractions: data?.max_ai_interactions ?? 50,
        aiScenarioGeneration: data?.ai_scenario_generation ?? false,
        peerEvaluationEnabled: data?.peer_evaluation_enabled ?? false,
        badgesEnabled: data?.badges_enabled ?? false,
        fullReportsEnabled: data?.full_reports_enabled ?? false,
        whitelabelEnabled: data?.whitelabel_enabled ?? false,
        aiInteractionsUsed: data?.ai_interactions_used ?? 0,
      });
    } catch {
      setSubscription(defaultSubscription);
    }
  }, [session?.access_token]);

  // Set up auth listener
  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setRoles([]);
          setProfile(null);
          setSubscription(defaultSubscription);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setInitialSessionLoaded(true);
    });

    return () => authSub.unsubscribe();
  }, []);

  // Fetch user data whenever user changes
  useEffect(() => {
    if (!initialSessionLoaded) return;
    if (user) {
      setLoading(true);
      fetchUserData(user.id).finally(() => setLoading(false));
    } else {
      setRoles([]);
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, initialSessionLoaded]);

  // Check subscription when session changes
  useEffect(() => {
    if (session?.user) {
      refreshSubscription();
    }
  }, [session?.user?.id, refreshSubscription]);

  // Periodic subscription refresh every 60s
  useEffect(() => {
    if (!session?.user) return;
    const interval = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(interval);
  }, [session?.user?.id, refreshSubscription]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, roles, profile, loading, subscription,
        signIn, signUp, signInWithGoogle, signOut, refreshSubscription,
        isAdmin: roles.includes("admin"),
        isProfessor: roles.includes("professor"),
        isStudent: roles.includes("student"),
        isInstitutionAdmin: roles.includes("institution_admin"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
