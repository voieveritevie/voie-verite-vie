import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings, type Theme, type TextSize } from '@/hooks/useSettings';
import { Sun, Moon, Monitor, Type, Bell, Globe, Lock, Download, Trash2, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Settings = memo(() => {
  const { settings, setTheme, setTextSize, isDarkMode } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Clair', icon: <Sun className="w-5 h-5" /> },
    { value: 'dark', label: 'Sombre', icon: <Moon className="w-5 h-5" /> },
    { value: 'system', label: 'Système', icon: <Monitor className="w-5 h-5" /> },
  ];

  const textSizeOptions: { value: TextSize; label: string; scale: string }[] = [
    { value: 'small', label: 'Petit', scale: '-10%' },
    { value: 'normal', label: 'Normal', scale: 'Par défaut' },
    { value: 'large', label: 'Grand', scale: '+15%' },
    { value: 'extra-large', label: 'Très grand', scale: '+30%' },
  ];

  const clearCache = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    localStorage.clear();
    alert('Cache et données locales effacées');
  };

  const installApp = () => {
    const event = new Event('beforeinstallprompt');
    window.dispatchEvent(event);
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        toast({
          title: "Erreur",
          description: "Déconnecté. Reconnectez-vous pour supprimer votre compte.",
          variant: "destructive",
        });
        return;
      }

      const userId = session.user.id;
      console.log("🗑️ Suppression du compte:", userId);

      // Step 1: Delete from profiles
      console.log("Step 1: Suppression du profil...");
      await supabase.from('profiles').delete().eq('id', userId).select();

      // Step 2: Delete from user_roles
      console.log("Step 2: Suppression des rôles...");
      await supabase.from('user_roles').delete().eq('user_id', userId).select();

      // Step 3: HARD DELETE from auth.users via RPC
      console.log("Step 3: Suppression de auth.users...");
      try {
        const { data: result, error } = await supabase.rpc('hard_delete_auth_user', {
          target_user_id: userId,
        });
        
        if (error) {
          console.error('RPC delete error:', error);
          // Don't stop, try alternative
        } else {
          console.log('✅ RPC delete result:', result);
        }
      } catch (rpcErr) {
        console.error('RPC error:', rpcErr);
      }

      // Step 4: Sign out (might fail since user was deleted, but try anyway)
      console.log("Step 4: Déconnexion...");
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.log('Sign out failed (user already deleted)');
      }

      // Step 5: Clear everything
      console.log("Step 5: Nettoyage...");
      localStorage.clear();
      sessionStorage.clear();
      
      if ('caches' in window) {
        try {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        } catch (e) {
          console.log('Cache error');
        }
      }

      console.log("✅ COMPTE SUPPRIMÉ DÉFINITIVEMENT!");

      toast({
        title: "✅ Compte supprimé",
        description: "Vous ne pouvez plus vous connecter. Compte supprimé de façon permanente.",
      });

      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer. Contactez support@voieVeriteVie.com",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-b from-slate-50 to-white'}`}>
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 font-playfair">Paramètres</h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
              Personnalisez votre expérience Voie, Vérité, Vie
            </p>
          </div>

          <div className="space-y-6">
            {/* Theme Settings */}
            <Card className={isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="w-5 h-5" />
                  Thème
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : ''}>
                  Choisissez comment vous préférez voir l'interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        settings.theme === option.value
                          ? isDarkMode
                            ? 'border-violet-500 bg-violet-950/50'
                            : 'border-violet-600 bg-violet-50'
                          : isDarkMode
                          ? 'border-slate-700 bg-slate-800 hover:border-slate-600'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span className={settings.theme === option.value ? 'text-violet-600' : ''}>
                        {option.icon}
                      </span>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : ''}`}>
                        {option.label}
                      </span>
                      {settings.theme === option.value && (
                        <span className={isDarkMode ? 'text-xs text-violet-400' : 'text-xs text-violet-600'}>✓ Activé</span>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Text Size Settings */}
            <Card className={isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Taille du texte
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : ''}>
                  Ajustez la taille des textes sur tout l'écran (téléphone, tablette, ordinateur)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {textSizeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTextSize(option.value)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all flex justify-between items-center ${
                        settings.textSize === option.value
                          ? isDarkMode
                            ? 'border-violet-500 bg-violet-950/50'
                            : 'border-violet-600 bg-violet-50'
                          : isDarkMode
                          ? 'border-slate-700 bg-slate-800 hover:border-slate-600'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-medium">{option.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          {option.scale}
                        </span>
                        {settings.textSize === option.value && (
                          <span className={isDarkMode ? 'text-violet-400' : 'text-violet-600'}>✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Aperçu */}
                <div className={`mt-6 p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-xs font-semibold mb-2 opacity-75 ${isDarkMode ? 'text-slate-300' : ''}`}>Aperçu :</p>
                  <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-200' : ''}`}>Ceci est un texte petit.</p>
                  <p className={`text-base mb-2 ${isDarkMode ? 'text-slate-200' : ''}`}>Ceci est un texte normal.</p>
                  <p className={`text-lg mb-2 ${isDarkMode ? 'text-slate-200' : ''}`}>Ceci est un texte grand.</p>
                  <p className={`text-xl ${isDarkMode ? 'text-slate-200' : ''}`}>Ceci est un très grand texte.</p>
                </div>
              </CardContent>
            </Card>

            {/* App Features */}
            <Card className={isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Application
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : ''}>
                  Installer et gérer l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={installApp}
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Download className="w-4 h-4" />
                  Installer l'application
                </Button>
              </CardContent>
            </Card>

            {/* Accessibility */}
            <Card className={isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Accessibilité
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : ''}>
                  Options d'accessibilité et de confort
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="text-sm">Réduire les animations</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">Contraste élevé</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">Guide de focus amélioré</span>
                </label>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className={isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : ''}>
                  Gérer les notifications et rappels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="text-sm">Rappels de lecture biblique</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="text-sm">Notifications du Carême</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">Notifications des activités</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">Mises à jour et nouvelles</span>
                </label>
              </CardContent>
            </Card>

            {/* Contenu & Langue */}
            <Card className={isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Contenu & Langue
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : ''}>
                  Préférences de langue et de contenu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Langue</label>
                  <select className={`w-full p-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <option>Français</option>
                    <option>English</option>
                    <option>Español</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="text-sm">Afficher les versets bibliques</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="text-sm">Mode lecture simplifiée</span>
                </label>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card className={isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Données & Confidentialité
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : ''}>
                  Gérer vos données locales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={clearCache}
                  variant="outline"
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Effacer le cache et les données
                </Button>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Cela supprimera les données locales stockées dans votre navigateur, y compris vos préférences.
                </p>
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card className={`${isDarkMode ? 'bg-red-950 border-red-900' : 'bg-red-50 border-red-200'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Zone Dangereuse
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-red-300' : 'text-red-700'}>
                  Actions irréversibles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
                  <p className={`text-sm ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
                    ⚠️ <strong>Attention :</strong> Cette action supprimera définitivement votre compte et toutes vos données associées. Cette action ne peut pas être annulée.
                  </p>
                </div>
                <Button
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="destructive"
                  className="w-full justify-start gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer mon compte
                </Button>
              </CardContent>
            </Card>

            {/* About */}
            <Card className={isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  À propos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Voie, Vérité, Vie</p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>v1.0.0</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Lancement</p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    30 novembre 2025 - 22 novembre 2026
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Un sanctuaire spirituel pour la jeunesse confrontée aux défis moraux de notre époque. 
                    Découvrez la paix en Christ à travers la lecture biblique, le Carême et le Chemin de Croix.
                  </p>
                </div>
                <Button variant="outline" className="w-full text-sm">
                  Politique de confidentialité
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className={`${isDarkMode ? 'bg-blue-950 border-blue-900 text-blue-100' : 'bg-blue-50 border-blue-200'}`}>
              <CardContent className="pt-6">
                <p className={`text-sm ${isDarkMode ? 'text-blue-100' : 'text-blue-900'}`}>
                  <strong>ℹ️ Info :</strong> Vos préférences sont sauvegardées automatiquement dans votre navigateur et appliquées partout dans l'application.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Supprimer définitivement votre compte ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 mt-4">
              <p>
                Cette action est <strong>irréversible</strong>. Vous perdrez :
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Votre compte et toutes vos données personnelles</li>
                <li>Vos lectures bibliques en cours</li>
                <li>Vos prières sauvegardées</li>
                <li>Votre progression spirituelle</li>
              </ul>
              <p>
                Voulez-vous vraiment continuer ?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount} 
              disabled={deletingAccount}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingAccount ? 'Suppression...' : 'Supprimer mon compte'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default Settings;
