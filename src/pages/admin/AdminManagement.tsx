import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
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
import { ArrowLeft, Shield, Trash2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin_principal' | 'admin' | 'moderator';
}

const AdminManagement = () => {
  const navigate = useNavigate();
  const { user, isAdmin, adminRole, loading: authLoading } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin || adminRole !== 'admin_principal') {
        navigate(adminRole ? '/admin' : '/');
        return;
      }
      loadAdmins();
    }
  }, [user, isAdmin, adminRole, authLoading, navigate]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin_principal', 'admin', 'moderator'] as any);

      if (!adminRoles) return;

      const userIds = adminRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const adminUsers = profiles?.map(profile => {
        const role = adminRoles.find(r => r.user_id === profile.id)?.role;
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: role as any,
        };
      }) || [];

      setAdmins(adminUsers);
    } finally {
      setLoading(false);
    }
  };

  const updateAdminRole = async (userId: string, newRole: 'admin' | 'moderator') => {
    try {
      // Supprimer l'ancien rôle
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Ajouter le nouveau rôle
      await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });

      toast.success('Rôle mis à jour');
      loadAdmins();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    }
  };

  const deleteAdmin = async () => {
    if (!selectedAdminId) return;
    try {
      // Supprimer le rôle admin
      await supabase.from('user_roles').delete().eq('user_id', selectedAdminId);
      
      toast.success('Admin supprimé');
      setDeleteDialogOpen(false);
      loadAdmins();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin_principal': return '👑 Admin Principal';
      case 'admin': return '🔐 Admin';
      case 'moderator': return '📋 Modérateur';
      default: return 'Utilisateur';
    }
  };

  if (loading || authLoading) return <AdminLoadingSpinner />;
  if (!user || !isAdmin || adminRole !== 'admin_principal') return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8" /> Gestion des Administrateurs
          </h1>
          <p className="text-muted-foreground">Page réservée à l'Admin Principal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {admins.length} administrateur(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => {
                  const isCurrentUser = user?.id === admin.id;
                  
                  return (
                    <TableRow key={admin.id} className={isCurrentUser ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">
                        {admin.full_name || 'Non renseigné'}
                        {isCurrentUser && <span className="ml-2 text-xs text-primary">(Vous)</span>}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            admin.role === 'admin_principal' ? 'default' :
                            admin.role === 'admin' ? 'secondary' :
                            'outline'
                          }
                        >
                          {getRoleLabel(admin.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {!isCurrentUser && (admin.role as any) !== 'admin_principal' && (
                          <>
                            <Select 
                              value={(admin.role as any) === 'admin_principal' ? 'admin' : admin.role}
                              onValueChange={(newRole: any) => updateAdminRole(admin.id, newRole)}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="moderator">Modérateur</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedAdminId(admin.id);
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
            <AlertDialogTitle>Retirer les droits admin</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer cette personne des administrateurs?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={deleteAdmin} className="bg-destructive">
            Retirer
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminManagement;
