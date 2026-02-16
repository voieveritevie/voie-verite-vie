import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Users, Shield, Trash2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
}

interface UserRole {
  user_id: string;
  role: 'admin_principal' | 'admin' | 'moderator' | 'user';
  created_at?: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    // Chercher un rôle admin parmi tous les rôles
    const adminRole = userRoles?.find((r: any) => 
      ['admin_principal', 'admin', 'moderator'].includes(r.role)
    );

    if (!adminRole) {
      navigate('/');
      return;
    }

    setIsMainAdmin(adminRole.role === 'admin_principal');
    loadData();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*')
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (userId: string): UserRole['role'] => {
    const role = roles.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const getRoleLabel = (role: UserRole['role']) => {
    switch (role) {
      case 'admin_principal': return '👑 Admin Principal';
      case 'admin': return '🔐 Admin';
      case 'moderator': return '📋 Modérateur';
      default: return 'Utilisateur';
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole['role']) => {
    try {
      const currentRole = getUserRole(userId);
      
      if (currentRole !== 'user') {
        await supabase.from('user_roles').delete().eq('user_id', userId);
      }

      if (newRole !== 'user') {
        await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      }

      toast.success('Rôle mis à jour');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteUser = async () => {
    if (!selectedUserId) return;
    try {
      // Supprimer d'abord les rôles
      await supabase.from('user_roles').delete().eq('user_id', selectedUserId);
      // Puis supprimer le profil
      await supabase.from('profiles').delete().eq('id', selectedUserId);
      
      toast.success('Utilisateur supprimé');
      setDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading || authLoading) return <AdminLoadingSpinner />;
  if (!user || (!isMainAdmin && getUserRole(user.id) !== 'admin')) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Users className="h-8 w-8" /> Gestion des Utilisateurs
          </h1>
          {isMainAdmin && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Shield className="h-4 w-4" /> Vous êtes Admin Principal
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {profiles.length} utilisateur(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => {
                  const role = getUserRole(profile.id);
                  const isCurrentUser = user?.id === profile.id;
                  
                  return (
                    <TableRow key={profile.id} className={isCurrentUser ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">
                        {profile.full_name || 'Non renseigné'}
                        {isCurrentUser && <span className="ml-2 text-xs text-primary">(Vous)</span>}
                      </TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            role === 'admin_principal' ? 'default' :
                            role === 'admin' ? 'secondary' :
                            role === 'moderator' ? 'outline' :
                            'secondary'
                          }
                          className={role === 'admin_principal' ? 'bg-gradient-peace' : ''}
                        >
                          {getRoleLabel(role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '-'}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {isMainAdmin && !isCurrentUser && (
                          <>
                            <Select value={role} onValueChange={(newRole: any) => updateUserRole(profile.id, newRole)}>
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Utilisateur</SelectItem>
                                <SelectItem value="moderator">Modérateur</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedUserId(profile.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={deleteUser} className="bg-destructive">
            Supprimer
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
