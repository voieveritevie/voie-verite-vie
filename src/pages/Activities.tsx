import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Clock, Search, CheckCircle, CalendarRange, User } from 'lucide-react';
import ActivityRegistrationModal from '@/components/ActivityRegistrationModal';
import { supabase } from '@/integrations/supabase/client';
import activityConference from '@/assets/activity-conference.jpg';
import activityMeditation from '@/assets/activity-meditation.jpg';
import activityBibleStudy from '@/assets/activity-bible-study.jpg';
import activityCommunity from '@/assets/activity-community.jpg';
import activityCreative from '@/assets/activity-creative.jpg';

interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  max_participants: number;
  price: string;
  image_url: string | null;
  is_published: boolean;
  allow_registration: boolean;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
}

const defaultImages: Record<string, string> = {
  'conferences': activityConference,
  'bien-etre': activityMeditation,
  'etudes': activityBibleStudy,
  'projets': activityCommunity,
  'discussions': activityConference,
  'creativite': activityCreative,
  'culturel': activityCommunity,
  'general': activityCommunity,
};

const Activities = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('is_published', true)
      .order('date', { ascending: true });
    
    if (data && !error) {
      setActivities(data);
      // Load registration counts
      const counts: Record<string, number> = {};
      for (const activity of data) {
        const { count } = await supabase
          .from('activity_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('activity_name', activity.title);
        counts[activity.id] = count || 0;
      }
      setRegistrationCounts(counts);
    }
    setLoading(false);
  };

  const getActivityImage = (activity: Activity) => {
    if (activity.image_url) return activity.image_url;
    return defaultImages[activity.category] || activityConference;
  };

  const getActivityTimeStatus = (activity: Activity) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(activity.start_date || activity.date);
    startDate.setHours(0, 0, 0, 0);
    
    // Check end date if exists
    if (activity.end_date) {
      const endDate = new Date(activity.end_date);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < today) return 'past';
      if (startDate <= today && endDate >= today) return 'ongoing';
    } else {
      if (startDate < today) return 'past';
    }
    
    if (startDate.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  // Separate past and upcoming activities
  const upcomingActivities = activities.filter(a => getActivityTimeStatus(a) !== 'past');
  const pastActivities = activities.filter(a => getActivityTimeStatus(a) === 'past');

  const filteredUpcomingActivities = upcomingActivities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredPastActivities = pastActivities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleRegister = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const formatDateRange = (activity: Activity) => {
    const startDate = new Date(activity.start_date || activity.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    if (activity.end_date) {
      const endDate = new Date(activity.end_date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      return `${startDate} - ${endDate}`;
    }
    return startDate;
  };

  const formatTimeRange = (activity: Activity) => {
    if (activity.start_time && activity.end_time) {
      return `${activity.start_time} - ${activity.end_time}`;
    }
    return activity.start_time || activity.time;
  };

  const renderActivityCard = (activity: Activity, isPast: boolean = false) => {
    const timeStatus = getActivityTimeStatus(activity);
    
    return (
      <div 
        key={activity.id} 
        className={`bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-subtle border border-border/50 hover:shadow-elegant transition-all duration-300 group animate-fade-in-up ${isPast ? 'opacity-70' : ''}`}
      >
        <div className="h-48 relative overflow-hidden">
          <img 
            src={getActivityImage(activity)} 
            alt={activity.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          <div className="absolute bottom-4 left-4 z-10">
            <div className="flex items-center space-x-2 text-white">
              {activity.end_date ? (
                <CalendarRange className="w-5 h-5" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
              <p className="text-sm font-semibold">
                {formatDateRange(activity)}
              </p>
            </div>
          </div>
          {timeStatus === 'today' && (
            <div className="absolute top-4 right-4 z-10">
              <Badge className="bg-green-500 text-white animate-pulse">
                <Clock className="w-3 h-3 mr-1" /> Aujourd'hui
              </Badge>
            </div>
          )}
          {timeStatus === 'ongoing' && (
            <div className="absolute top-4 right-4 z-10">
              <Badge className="bg-blue-500 text-white">
                <Clock className="w-3 h-3 mr-1" /> En cours
              </Badge>
            </div>
          )}
          {isPast && (
            <div className="absolute top-4 right-4 z-10">
              <Badge variant="secondary">
                <CheckCircle className="w-3 h-3 mr-1" /> Terminée
              </Badge>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-playfair font-semibold text-primary leading-tight mb-3">
            {activity.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {activity.description}
          </p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-2 text-primary" />
              {formatTimeRange(activity)}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2 text-primary" />
              {activity.location}
            </div>
          </div>
          
          {/* Affichage conditionnel selon allow_registration */}
          {activity.allow_registration && (
            <>
              {/* Nombre d'inscrits - Visible uniquement si inscriptions activées */}
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <User className="w-4 h-4 text-primary" />
                <span>
                  {registrationCounts[activity.id] || 0} inscrit{(registrationCounts[activity.id] || 0) > 1 ? 's' : ''} 
                  {activity.max_participants > 0 && ` / ${activity.max_participants} places`}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-primary">
                  {activity.price}
                </span>
                {!isPast ? (
                  <Button 
                    size="sm" 
                    className="divine-glow"
                    onClick={() => handleRegister(activity)}
                    disabled={activity.max_participants > 0 && (registrationCounts[activity.id] || 0) >= activity.max_participants}
                  >
                    {activity.max_participants > 0 && (registrationCounts[activity.id] || 0) >= activity.max_participants 
                      ? 'Complet' 
                      : "S'inscrire"}
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Événement passé
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-8 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-playfair font-bold text-primary mb-4">
                Nos Activités
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Découvrez nos événements, ateliers et moments de partage spirituel
              </p>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="py-6 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher une activité..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 bg-card/50 backdrop-blur-sm border-border/50"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Activities */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {loading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-4">Chargement des activités...</p>
                </div>
              ) : (
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                    <TabsTrigger value="upcoming" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      À venir ({filteredUpcomingActivities.length})
                    </TabsTrigger>
                    <TabsTrigger value="past" className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Passées ({filteredPastActivities.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming">
                    {filteredUpcomingActivities.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredUpcomingActivities.map((activity) => renderActivityCard(activity, false))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-playfair font-semibold text-primary mb-2">
                          Aucune activité à venir
                        </h3>
                        <p className="text-muted-foreground">
                          De nouvelles activités seront bientôt disponibles
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="past">
                    {filteredPastActivities.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPastActivities.map((activity) => renderActivityCard(activity, true))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-playfair font-semibold text-primary mb-2">
                          Aucune activité passée
                        </h3>
                        <p className="text-muted-foreground">
                          Les activités terminées s'afficheront ici
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </section>
      </main>

      <ActivityRegistrationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedActivity(null);
          loadActivities();
        }}
        activityName={selectedActivity?.title || ''}
        activityId={selectedActivity?.id}
      />
    </div>
  );
};

export default Activities;
