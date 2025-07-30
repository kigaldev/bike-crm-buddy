import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Branding {
  empresa_id: string;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  tipografia_base: string | null;
  modo_oscuro: boolean;
  updated_at: string;
}

interface BrandingContextType {
  branding: Branding | null;
  loading: boolean;
  updateBranding: (updates: Partial<Branding>) => Promise<void>;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchBranding = async () => {
    if (!user || !profile?.empresa_actual) {
      setBranding(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('obtener_branding_empresa_actual');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setBranding(data[0] as Branding);
      } else {
        setBranding(null);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
      setBranding(null);
    } finally {
      setLoading(false);
    }
  };

  const updateBranding = async (updates: Partial<Branding>) => {
    try {
      const { data, error } = await supabase.rpc('actualizar_branding_empresa', {
        p_logo_url: updates.logo_url,
        p_color_primario: updates.color_primario,
        p_color_secundario: updates.color_secundario,
        p_tipografia_base: updates.tipografia_base,
        p_modo_oscuro: updates.modo_oscuro,
      });

      if (error) throw error;
      
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const brandingData = data as any;
        if (!brandingData.error) {
          setBranding(brandingData as Branding);
          // Aplicar colores CSS inmediatamente
          if (updates.color_primario || updates.color_secundario) {
            applyBrandingToCSS(brandingData as Branding);
          }
        }
      }
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  };

  const refreshBranding = async () => {
    setLoading(true);
    await fetchBranding();
  };

  // Aplicar branding a variables CSS
  const applyBrandingToCSS = (brandingData: Branding) => {
    if (!brandingData) return;

    const root = document.documentElement;
    
    // Convertir hex a HSL para compatibilidad con Tailwind
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    try {
      // Aplicar color primario
      if (brandingData.color_primario) {
        const primaryHsl = hexToHsl(brandingData.color_primario);
        root.style.setProperty('--primary', primaryHsl);
      }

      // Aplicar color secundario
      if (brandingData.color_secundario) {
        const secondaryHsl = hexToHsl(brandingData.color_secundario);
        root.style.setProperty('--secondary', secondaryHsl);
      }

      // Aplicar modo oscuro
      if (brandingData.modo_oscuro) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Aplicar tipografía base
      if (brandingData.tipografia_base) {
        root.style.setProperty('--font-family-base', brandingData.tipografia_base);
      }
    } catch (error) {
      console.error('Error applying branding to CSS:', error);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchBranding();
    } else {
      setBranding(null);
      setLoading(false);
    }
  }, [user, profile]);

  // Aplicar branding cuando cambie
  useEffect(() => {
    if (branding) {
      applyBrandingToCSS(branding);
    }
  }, [branding]);

  const value = {
    branding,
    loading,
    updateBranding,
    refreshBranding,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}