import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BrandingConfig {
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
}

const BrandingContext = createContext<BrandingConfig>({
  primaryColor: null,
  secondaryColor: null,
  accentColor: null,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [config, setConfig] = useState<BrandingConfig>({
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
  });

  useEffect(() => {
    if (!user) {
      // Reset branding when logged out
      setConfig({ primaryColor: null, secondaryColor: null, accentColor: null });
      return;
    }

    const fetchBranding = async () => {
      // Get user's institution via course membership
      const { data: memberships } = await supabase
        .from("course_members")
        .select("course_id")
        .eq("user_id", user.id)
        .limit(1);

      let institutionId: string | null = null;

      if (memberships && memberships.length > 0) {
        const { data: course } = await supabase
          .from("courses")
          .select("institution_id")
          .eq("id", memberships[0].course_id)
          .single();
        institutionId = course?.institution_id || null;
      }

      // Also check if user is a professor in a group
      if (!institutionId) {
        const { data: groups } = await supabase
          .from("groups")
          .select("course_id")
          .eq("professor_id", user.id)
          .not("course_id", "is", null)
          .limit(1);

        if (groups && groups.length > 0 && groups[0].course_id) {
          const { data: course } = await supabase
            .from("courses")
            .select("institution_id")
            .eq("id", groups[0].course_id)
            .single();
          institutionId = course?.institution_id || null;
        }
      }

      if (!institutionId) return;

      const { data: inst } = await supabase
        .from("institutions")
        .select("*")
        .eq("id", institutionId)
        .single();

      if (inst) {
        setConfig({
          primaryColor: (inst as any).brand_primary_color || null,
          secondaryColor: (inst as any).brand_secondary_color || null,
          accentColor: (inst as any).brand_accent_color || null,
        });
      }
    };

    fetchBranding();
  }, [user?.id]);

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (config.primaryColor) {
      root.style.setProperty("--primary", config.primaryColor);
      root.style.setProperty("--ring", config.primaryColor);
      root.style.setProperty("--sidebar-primary", config.primaryColor);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
    }

    if (config.secondaryColor) {
      root.style.setProperty("--secondary", config.secondaryColor);
    } else {
      root.style.removeProperty("--secondary");
    }

    if (config.accentColor) {
      root.style.setProperty("--accent", config.accentColor);
      root.style.setProperty("--sidebar-ring", config.accentColor);
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--sidebar-ring");
    }

    // Cleanup on unmount
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--sidebar-ring");
    };
  }, [config]);

  return (
    <BrandingContext.Provider value={config}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
