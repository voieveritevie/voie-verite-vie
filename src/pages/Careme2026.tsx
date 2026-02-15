import { memo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, ChevronRight, Flame, Heart, BookOpen, Users, Calendar, Share2, Printer, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { generateShareImage, shareImage } from '@/lib/share-utils';
import { caremeData } from '@/data/careme-2026-data';

const Careme2026 = memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyCareme, notify } = useNotifications();
  const [selectedDay, setSelectedDay] = useState<any | null>(null);
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [contentData, setContentData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Flatten all days
  const allDays = contentData?.days || caremeData.fullProgram.flatMap((week: any) =>
    week.days.map((day: any) => ({
      date: day.date,
      title: day.title || '',
      readings: day.readings || '',
      actions: day.actions,
      weekTitle: week.title,
    }))
  );

  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  const parseDateFromLabel = (label: string): Date | null => {
    const months: Record<string, number> = {
      janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
    };
    const m = label.toLowerCase().match(/(\d{1,2})(?:er)?\s*(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const monthName = m[2].toLowerCase();
    const month = months[monthName as keyof typeof months];
    if (Number.isNaN(day) || month === undefined) return null;
    return new Date(2026, month, day, 0, 0, 0, 0);
  };

  const isSunday = (d: any) => {
    const s = (d?.date || d?.title || '').toString().toLowerCase();
    return s.startsWith('dimanche') || s.includes('dimanche');
  };

  const isCompletedDate = (dateObj: Date | null) => {
    if (!dateObj) return false;
    return completedDates.includes(toIsoDate(dateObj));
  };

  const canMarkCompleted = (dateObj: Date | null) => {
    if (!dateObj) return false;
    // Créer aujourd'hui à 00:00:00 pour comparer les dates sans l'heure
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Créer une copy de dateObj à 00:00:00
    const dayToMark = new Date(dateObj);
    dayToMark.setHours(0, 0, 0, 0);
    
    // On peut marquer complété seulement si la date est aujourd'hui ou dans le passé
    return dayToMark <= today;
  };

  const loadContent = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('page_content')
        .select('*')
        .eq('page_key', 'careme-2026')
        .single();

      if (data?.content) {
        setContentData(data.content);
      }
    } catch (err) {
      console.error('Failed to load content', err);
    }
  }, []);

  const loadUserProgress = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_program_progress')
        .select('date')
        .eq('user_id', user.id)
        .eq('program_key', 'careme-2026');
      setCompletedDates((data || []).map((r: any) => r.date));
    } catch (err) {
      console.error('Failed to load progress', err);
    }
  }, [user]);

  const markCompleted = async (dateObj: Date | null) => {
    if (!user || !dateObj) return window.location.assign('/auth');
    
    // Vérifier que la date n'est pas dans le futur
    if (!canMarkCompleted(dateObj)) {
      toast({ 
        title: 'Date impossible', 
        description: 'Vous ne pouvez marquer que les jours passés ou le jour actuel comme complétés',
        variant: 'destructive' 
      });
      return;
    }
    
    const dateStr = toIsoDate(dateObj);
    setCompletedDates((s) => Array.from(new Set([...s, dateStr])));
    try {
      await supabase.from('user_program_progress').upsert({
        user_id: user.id,
        program_key: 'careme-2026',
        date: dateStr,
      }, { onConflict: 'user_id,program_key,date' });
      toast({ title: 'Jour marqué comme complété ✓' });
      // Notification automatique de succès
      const today = new Date();
      const todayDayNum = today.getDate();
      await notifyCareme(todayDayNum, `Jour complété! 🙏`);
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
  };

  const unmarkCompleted = async (dateObj: Date | null) => {
    if (!user || !dateObj) return;
    const dateStr = toIsoDate(dateObj);
    setCompletedDates((s) => s.filter(d => d !== dateStr));
    try {
      await supabase.from('user_program_progress').delete()
        .eq('user_id', user.id)
        .eq('program_key', 'careme-2026')
        .eq('date', dateStr);
      toast({ title: 'Jour retiré' });
    } catch (err) {
      console.error(err);
    }
  };

  const shareDay = async (day: any) => {
    if (!day) return;
    try {
      const dayNum = allDays.filter((d: any) => !isSunday(d)).findIndex((d: any) => d.date === day.date) + 1;

      // Générer l'image optimisée
      const blob = await generateShareImage({
        title: `${day.date}${day.title ? ' - ' + day.title : ''}`,
        reading: day.readings,
        text: day.actions?.soi ? `🪞 ${day.actions.soi}` : undefined,
        meditation: day.actions?.prochain ? `❤️ ${day.actions.prochain}` : undefined,
        prayer: day.actions?.dieu ? `🙏 ${day.actions.dieu}` : undefined,
        number: dayNum,
        type: 'day',
      });

      if (blob) {
        // Partager l'image
        const shared = await shareImage(blob, `Careme-Jour-${String(dayNum).padStart(2, '0')}`);
        if (!shared) {
          alert('✝️ Image prête à être partagée sur vos réseaux!');
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du partage');
    }
  };

  const shareConcreteActions = async (day: any) => {
    if (!day) return;
    try {
      const dayNum = allDays.filter((d: any) => !isSunday(d)).findIndex((d: any) => d.date === day.date) + 1;

      // Générer l'image optimisée avec les actions
      const actionsList = [
        day.actions?.soi ? `🪞 Soi: ${day.actions.soi}` : null,
        day.actions?.prochain ? `❤️ Prochain: ${day.actions.prochain}` : null,
        day.actions?.dieu ? `🙏 Dieu: ${day.actions.dieu}` : null,
      ].filter(Boolean).join('\n\n');

      const blob = await generateShareImage({
        title: 'Actions pour aujourd\'hui',
        subtitle: `Jour ${dayNum}/40 - ${day.date}`,
        text: actionsList,
        number: dayNum,
        type: 'day',
      });

      if (blob) {
        // Partager l'image
        const shared = await shareImage(blob, `Careme-Actions-Jour-${String(dayNum).padStart(2, '0')}`);
        if (!shared) {
          alert('✝️ Image des actions prête à être partagée!');
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du partage');
    }
  };

  const shareAllDays = async () => {
    alert('👉 Sélectionnez un jour pour le partager individuellement sur vos réseaux sociaux!\n\n🙏 Chaque jour peut être partagé facilement avec un clic sur "Partager ce jour"');
  };

  useEffect(() => {
    loadContent();
    loadUserProgress();
  }, [user, loadContent, loadUserProgress]);

  const nonSundayDays = allDays.filter((d: any) => !isSunday(d));
  const completionRate = nonSundayDays.length > 0 
    ? Math.round((completedDates.length / nonSundayDays.length) * 100)
    : 0;

  const printPage = () => window.print();
  const shareProgram = async () => {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: 'Carême 2026 — Voie-Vérité-Vie',
          text: '40 jours de prière, pénitence et partage',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Lien copié' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:bg-slate-950 dark:text-slate-100">
      <Navigation />

      {/* Hero Section */}
      <header className="bg-gradient-to-br from-violet-700 via-violet-600 to-violet-800 text-white pt-20 pb-12 px-4 relative overflow-hidden dark:from-violet-900 dark:via-violet-800 dark:to-violet-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Flame className="w-8 h-8 text-violet-200" />
            <span className="text-sm font-semibold text-violet-200">Entreprendre votre chemin</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">Carême 2026</h1>
          <p className="text-base sm:text-lg text-violet-100 max-w-2xl">40 jours de transformation spirituelle : prière, pénitence et partage. Un parcours vers la Pâques.</p>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-8 md:py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/10 border-violet-200">
            <CardContent className="pt-6">
              <div className="text-2xl sm:text-3xl font-bold text-violet-700">{nonSundayDays.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Jours dans le programme</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200">
            <CardContent className="pt-6">
              <div className="text-2xl sm:text-3xl font-bold text-green-700">{completedDates.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Jours complétés</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-2xl sm:text-3xl font-bold text-blue-700">{completionRate}%</div>
              <p className="text-xs sm:text-sm text-gray-600">Progression</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-200">
            <CardContent className="pt-6">
              <div className="text-2xl sm:text-3xl font-bold text-amber-700">40</div>
              <p className="text-xs sm:text-sm text-gray-600">Jours requis</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-3 mb-6 bg-slate-100 p-1 rounded-lg dark:bg-slate-800 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-0 sm:px-3">📅 Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm px-0 sm:px-3">📋 Calendrier</TabsTrigger>
            <button onClick={() => navigate('/chemin-de-croix')} className="flex gap-1 sm:gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm justify-center items-center transition-colors whitespace-nowrap">✝️ <span className="hidden sm:inline">Chemin de Croix</span><span className="sm:hidden">Chemin</span></button>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* The 3 Pillars */}
              <Card className="border-violet-200">
                <CardHeader className="bg-gradient-to-r from-violet-50 to-violet-100/50 dark:bg-gradient-to-r dark:from-violet-950 dark:to-violet-900/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Flame className="w-5 h-5 text-violet-600" />
                    Les 3 Piliers
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex gap-3 items-start p-3 bg-violet-50 rounded-lg dark:bg-violet-950 dark:text-slate-100">
                    <BookOpen className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Prière</p>
                      <p className="text-xs text-gray-600">Chapelet, Lecture évangélique, Adoration</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-rose-50 rounded-lg">
                    <Heart className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Pénitence</p>
                      <p className="text-xs text-gray-600">Sobriété, Limiter les écrans</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-amber-50 rounded-lg">
                    <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Partage</p>
                      <p className="text-xs text-gray-600">Don concret, Service, Visite</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Rhythm */}
              <Card className="border-slate-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:bg-gradient-to-r dark:from-blue-950 dark:to-blue-900/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Rythme quotidien
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-gray-600">05:00</span>
                    <span className="font-medium">Prière d'introduction</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-gray-600">Toute la journée</span>
                    <span className="font-medium">Jeûne sobre</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-gray-600">18:00</span>
                    <span className="font-medium">Rupture / Prière</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Soir</span>
                    <span className="font-medium">Examen de conscience</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <Card className="border-green-200">
              <CardContent className="pt-6">
                <div className="mb-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-sm">Votre progression</span>
                    <span className="text-sm font-bold text-green-600">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">{completedDates.length} jours complétés sur {nonSundayDays.length}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex gap-2">
                <Button size="sm" onClick={printPage} variant="outline" className="gap-2">
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimer</span>
                </Button>
                <Button size="sm" onClick={shareProgram} variant="outline" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Partager</span>
                </Button>
              </div>
              <Button size="sm" onClick={shareAllDays} className="bg-violet-600 hover:bg-violet-700 text-white gap-2 w-full">
                <Share2 className="w-4 h-4" />
                Partager tous les 40 jours
              </Button>
            </div>

            <div className="space-y-4">
              {caremeData.fullProgram.map((week, weekIdx) => (
                <Card key={weekIdx} className="border-violet-100">
                  <CardHeader className="bg-gradient-to-r from-violet-50 to-violet-100/50 pb-3 dark:bg-gradient-to-r dark:from-violet-950 dark:to-violet-900/50">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg">{week.title}</CardTitle>
                      <span className="text-xs sm:text-sm text-gray-600">{week.range}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      {week.days.map((day, dayIdx) => {
                        const dateObj = parseDateFromLabel(day.date);
                        const isCompleted = isCompletedDate(dateObj);
                        const isSun = isSunday(day);
                        const canMark = canMarkCompleted(dateObj);
                        const isFuture = dateObj && !canMark && !isCompleted;
                        
                        return (
                          <button
                            key={dayIdx}
                            onClick={() => !isSun && !isFuture && setSelectedDay({ ...day, dateObj })}
                            disabled={isFuture}
                            className={`p-3 rounded-lg text-left transition-all active:scale-95 ${
                              isSun
                                ? 'bg-gray-50 border border-gray-200 cursor-default dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'
                                : isFuture
                                ? 'bg-gray-100 border border-gray-300 cursor-not-allowed opacity-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-500'
                                : 'bg-white border-2 border-violet-100 hover:border-violet-400 hover:shadow-md cursor-pointer dark:bg-slate-900 dark:border-violet-800 dark:text-slate-100'
                            } ${isCompleted ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{day.date}</div>
                                {day.title && <div className="text-xs text-violet-600 line-clamp-1">{day.title}</div>}
                              </div>
                              {isCompleted && <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Details Tab */}
        </Tabs>
      </main>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => { if (!open) setSelectedDay(null); }}>
        <DialogContent id={selectedDay ? 'share-source' : undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedDay?.date}</DialogTitle>
            {selectedDay?.title && <p className="text-sm text-gray-600 mt-2">{selectedDay.title}</p>}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedDay?.readings && (
              <div className="bg-slate-50 p-3 rounded-lg dark:bg-slate-900 dark:text-slate-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">Lectures bibliques</p>
                <p className="text-sm text-gray-700">{selectedDay.readings}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border-2 border-violet-200 p-4 bg-gradient-to-br from-violet-50 to-violet-100/30 dark:bg-gradient-to-br dark:from-violet-950 dark:to-violet-900/30 dark:border-violet-700 dark:text-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                  <h3 className="font-semibold text-sm text-violet-700">🪞 Soi</h3>
                </div>
                <p className="text-sm text-gray-700">{selectedDay?.actions?.soi}</p>
              </div>

              <div className="rounded-lg border-2 border-rose-200 p-4 bg-gradient-to-br from-rose-50 to-rose-100/30 dark:bg-gradient-to-br dark:from-rose-950 dark:to-rose-900/30 dark:border-rose-700 dark:text-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-rose-600" />
                  <h3 className="font-semibold text-sm text-rose-700">❤️ Prochain</h3>
                </div>
                <p className="text-sm text-gray-700">{selectedDay?.actions?.prochain}</p>
              </div>

              <div className="rounded-lg border-2 border-amber-200 p-4 bg-gradient-to-br from-amber-50 to-amber-100/30 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900/30 dark:border-amber-700 dark:text-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-sm text-amber-700">🙏 Dieu</h3>
                </div>
                <p className="text-sm text-gray-700">{selectedDay?.actions?.dieu}</p>
              </div>
            </div>

            {selectedDay?.dateObj && !isSunday(selectedDay) && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    onClick={() => shareDay(selectedDay)}
                    className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Partager</span>
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => isCompletedDate(selectedDay.dateObj) 
                      ? unmarkCompleted(selectedDay.dateObj) 
                      : markCompleted(selectedDay.dateObj)
                    }
                    variant={isCompletedDate(selectedDay.dateObj) ? 'default' : 'outline'}
                    disabled={!isCompletedDate(selectedDay.dateObj) && !canMarkCompleted(selectedDay.dateObj)}
                  >
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">{isCompletedDate(selectedDay.dateObj) ? 'Complété' : 'Compléter'}</span>
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setSelectedDay(null)} 
                    variant="outline"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default Careme2026;
