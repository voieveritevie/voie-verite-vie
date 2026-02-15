import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon, ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import galleryRetreat from '@/assets/gallery-retreat.jpg';

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  group_name: string | null;
}

interface GalleryGroup {
  name: string;
  title: string;
  description: string | null;
  coverImage: string;
  images: GalleryImage[];
}

const Gallery = () => {
  const [selectedGroup, setSelectedGroup] = useState<GalleryGroup | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryGroups, setGalleryGroups] = useState<GalleryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });
    
    if (data && data.length > 0) {
      // Group images by group_name or title
      const groupedImages = data.reduce((acc, img) => {
        const groupKey = img.group_name || img.title;
        if (!acc[groupKey]) {
          acc[groupKey] = {
            name: groupKey,
            title: img.title,
            description: img.description,
            coverImage: img.image_url,
            images: []
          };
        }
        acc[groupKey].images.push(img);
        return acc;
      }, {} as Record<string, GalleryGroup>);

      setGalleryGroups(Object.values(groupedImages));
    } else {
      // Default data if no images
      setGalleryGroups([{
        name: 'default',
        title: 'Retraite spirituelle',
        description: 'Moments de partage et de prière communautaire.',
        coverImage: galleryRetreat,
        images: [{
          id: 'default-1',
          title: 'Retraite spirituelle',
          description: 'Moments de partage et de prière communautaire.',
          image_url: galleryRetreat,
          category: 'general',
          group_name: null
        }]
      }]);
    }
    setLoading(false);
  };

  const openGroup = (group: GalleryGroup) => {
    setSelectedGroup(group);
    setCurrentImageIndex(0);
  };

  const closeModal = () => {
    setSelectedGroup(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedGroup) {
      setCurrentImageIndex((prev) => 
        prev < selectedGroup.images.length - 1 ? prev + 1 : 0
      );
    }
  };

  const prevImage = () => {
    if (selectedGroup) {
      setCurrentImageIndex((prev) => 
        prev > 0 ? prev - 1 : selectedGroup.images.length - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-8 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-playfair font-bold text-primary mb-4">
                Notre Galerie
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Revivez nos moments de partage, de prière et de croissance spirituelle
              </p>
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {galleryGroups.map((group) => (
                  <div 
                    key={group.name} 
                    className="bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-subtle border border-border/50 hover:shadow-elegant transition-all duration-300 group cursor-pointer animate-fade-in-up"
                    onClick={() => openGroup(group)}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img 
                        src={group.coverImage} 
                        alt={group.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                      
                      {/* Image count badge */}
                      {group.images.length > 1 && (
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-sm flex items-center gap-1">
                          <Grid className="w-3 h-3" />
                          {group.images.length}
                        </div>
                      )}
                      
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-lg font-playfair font-semibold text-white">
                          {group.title}
                        </h3>
                        {group.description && (
                          <p className="text-sm text-white/80 line-clamp-2 mt-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {galleryGroups.length === 0 && (
                <div className="text-center py-16">
                  <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-playfair font-semibold text-primary mb-2">
                    Aucune image dans la galerie
                  </h3>
                  <p className="text-muted-foreground">
                    Des photos seront bientôt disponibles
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Modal with image gallery */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
            <div className="max-w-5xl max-h-[90vh] w-full bg-card rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="relative flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70"
                  onClick={closeModal}
                >
                  <X className="w-4 h-4" />
                </Button>
                
                {/* Navigation arrows */}
                {selectedGroup.images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}
                
                <img 
                  src={selectedGroup.images[currentImageIndex].image_url} 
                  alt={selectedGroup.images[currentImageIndex].title}
                  className="w-full max-h-[70vh] object-contain bg-black"
                />

                {/* Image counter */}
                {selectedGroup.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {selectedGroup.images.length}
                  </div>
                )}
              </div>
              
              <div className="overflow-y-auto flex-1 p-6 border-t border-border/20">
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-6 border border-border/30">
                  <h3 className="text-2xl font-playfair font-bold text-primary mb-3">
                    {selectedGroup.images[currentImageIndex].title}
                  </h3>
                  
                  {selectedGroup.images[currentImageIndex].description && (
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-base">
                      {selectedGroup.images[currentImageIndex].description}
                    </p>
                  )}
                </div>

                {/* Thumbnails */}
                {selectedGroup.images.length > 1 && (
                  <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
                    {selectedGroup.images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={img.image_url} 
                          alt={img.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Gallery;
