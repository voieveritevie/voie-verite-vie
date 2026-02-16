import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async (userId: string, email?: string) => {
      try {
        console.log('Checking admin role for user:', userId, email);
        
        // Si c'est le superadmin et qu'il n'a pas le rôle, l'ajouter automatiquement
        if (email === 'ahdybau@gmail.com') {
          console.log('Superadmin detected - ensuring admin role is set...');
          
          // Vérifier d'abord s'il a un rôle admin
          const { data: existingRoles, error: checkError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);
          
          const hasAdminRole = existingRoles?.some((r: any) => 
            ['admin_principal', 'admin', 'moderator'].includes(r.role)
          );
          
          if (!checkError && !hasAdminRole) {
            // Si pas de rôle admin, ajouter admin_principal
            console.log('Adding admin_principal role to superadmin...');
            const { error: insertError } = await supabase
              .from('user_roles')
              .insert([
                {
                  user_id: userId,
                  role: 'admin_principal'
                }
              ]);
            
            if (insertError) {
              console.error('Error adding admin role:', insertError);
            } else {
              console.log('Admin_principal role successfully added');
            }
          }
        }
        
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
          return;
        }
        
        // Vérifier si l'utilisateur a un rôle admin (admin_principal, admin, ou moderator)
        const hasAdminRole = data && data.some((role: any) => 
          ['admin_principal', 'admin', 'moderator'].includes(role.role)
        );
        console.log('Admin role check result:', { data, hasAdminRole });
        setIsAdmin(hasAdminRole);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // IMPORTANT: keep callback synchronous to avoid auth deadlocks
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          checkAdminRole(session.user.id, session.user.email);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id, session.user.email).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phoneCountryCode?: string,
    phoneNumber?: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone_country_code: phoneCountryCode || null,
          phone_number: phoneNumber || null,
        }
      }
    });

    // Ensure user is logged in immediately after signup when email confirmation is disabled
    if (!error && !data.session) {
      await supabase.auth.signInWithPassword({ email, password });
    }
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
  };
};