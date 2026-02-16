import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { User, BookOpen, Heart, Activity, Mail, LogOut, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface PrayerBookmark {
  id: string;
  prayer_request_id: string;
  prayer_title: string;
  created_at: string;
}

interface ReadingProgress {
  id: string;
  book_name: string;
  chapter: number;
  date_read: string;
}

interface UserActivity {
  id: string;
  activity_type: string;
  activity_date: string;
  details: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prayers, setPrayers] = useState<PrayerBookmark[]>([]);
  const [readings, setReadings] = useState<ReadingProgress[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    prayersCount: 0,
    favoritesCount: 0,
    readingDays: 0,
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
        return;
      }
      loadUserData();
    }
  }, [user, authLoading, navigate]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Charger le profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Charger les prières sauvegardées
      // Note: prayer_favorites table doesn't exist yet
      setPrayers([]);
      setStats(s => ({ ...s, favoritesCount: 0 }));

      // Charger la progression de lecture
      // Note: daily_readings table doesn't exist yet
      setReadings([]);
      setStats(s => ({ ...s, readingDays: 0 }));

      // Autres statistiques
      const { count: prayersCount } = await supabase
        .from('prayer_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setStats(s => ({ ...s, prayersCount: prayersCount || 0 }));

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                <User className="h-10 w-10" />
                Mon Profil
              </h1>
              <p className="text-muted-foreground">Suivi personnel et progression spirituelle</p>
            </div>
            <Button variant="destructive" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>

          {/* Profil Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-sm text-muted-foreground mb-1">Nom</h2>
                  <p className="text-lg font-semibold">{profile.full_name || 'Non renseigné'}</p>
                </div>
                <div>
                  <h2 className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <Mail className="h-4 w-4" /> Email
                  </h2>
                  <p className="text-lg font-semibold">{profile.email}</p>
                </div>
                <div>
                  <h2 className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <Clock className="h-4 w-4" /> Membre depuis
                  </h2>
                  <p className="text-lg font-semibold">{formatDate(profile.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistiques */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{stats.prayersCount}</p>
              <p className="text-sm text-muted-foreground">Demandes de prière créées</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-3xl font-bold">{stats.favoritesCount}</p>
              <p className="text-sm text-muted-foreground">Prières sauvegardées</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-3xl font-bold">{stats.readingDays}</p>
              <p className="text-sm text-muted-foreground">Jours de lecture biblique</p>
            </CardContent>
          </Card>
        </div>

        {/* Contenu avec onglets */}
        <Tabs defaultValue="prayers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prayers">Prières Sauvegardées</TabsTrigger>
            <TabsTrigger value="readings">Lecture Biblique</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
          </TabsList>

          {/* Prières Sauvegardées */}
          <TabsContent value="prayers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" /> Prières Sauvegardées
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prayers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune prière sauvegardée pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {prayers.map((prayer) => (
                      <div key={prayer.id} className="p-3 border rounded-lg hover:bg-muted/50 transition">
                        <p className="font-medium">{prayer.prayer_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(prayer.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lecture Biblique */}
          <TabsContent value="readings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Lecture Biblique
                </CardTitle>
              </CardHeader>
              <CardContent>
                {readings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune lecture enregistrée pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {readings.map((reading) => (
                      <div 
                        key={reading.id} 
                        className="p-3 border rounded-lg hover:bg-muted/50 transition flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{reading.book_name}</p>
                          <Badge variant="secondary" className="mt-1">
                            Chapitre {reading.chapter}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(reading.date_read)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activité */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" /> Activité Récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Aucune activité enregistrée pour le moment.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Commencez à participer pour voir votre activité s'afficher ici.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="p-3 border-l-4 border-primary pl-4">
                        <p className="font-medium">{activity.activity_type}</p>
                        <p className="text-sm text-muted-foreground">{activity.details}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(activity.activity_date)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
