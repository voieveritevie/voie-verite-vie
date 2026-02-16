import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export type AdminRole = 'admin_principal' | 'admin' | 'moderator' | null;

export const useAdmin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  const checkAdmin = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        setAdminRole(null);
      } else if (data && data.length > 0) {
        // Chercher le rôle admin le plus haut dans la hiérarchie
        let userRole: AdminRole = null;
        
        if (data.some((r: any) => r.role === 'admin_principal')) {
          userRole = 'admin_principal';
        } else if (data.some((r: any) => r.role === 'admin')) {
          userRole = 'admin';
        } else if (data.some((r: any) => r.role === 'moderator')) {
          userRole = 'moderator';
        }
        
        if (userRole) {
          setIsAdmin(true);
          setAdminRole(userRole);
        } else {
          setIsAdmin(false);
          setAdminRole(null);
        }
      } else {
        setIsAdmin(false);
        setAdminRole(null);
      }
    } catch (err) {
      console.error('Error in checkAdmin:', err);
      setIsAdmin(false);
      setAdminRole(null);
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkAdmin(session.user.id);
      } else {
        setLoading(false);
        setChecked(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setLoading(true);
          await checkAdmin(session.user.id);
        } else {
          setIsAdmin(false);
          setAdminRole(null);
          setLoading(false);
          setChecked(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdmin]);

  return { user, isAdmin, adminRole, loading, checked };
};
