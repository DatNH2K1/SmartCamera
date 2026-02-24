import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { GalleryImage } from '../../types';
import { getGalleryImages, deleteImageFromGallery } from '../../services/galleryService';
import { useLanguage } from '../../contexts/LanguageContext';

interface GalleryViewProps {
  onClose: () => void;
}

export const GalleryPage: React.FC<GalleryViewProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const loadImages = async () => {
    try {
      const data = await getGalleryImages();
      // Filter out any invalid data (ensure ID is a number)
      setImages(data.filter((img) => img && typeof img.id === 'number'));
    } catch (error) {
      console.error('Failed to load images', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    // Prevent event bubbling to parent (which opens the image)
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Check strict null/undefined. ID 0 is valid in some DBs, though autoIncrement usually starts at 1.
    if (id === undefined || id === null) return;

    if (window.confirm(t('gallery.delete_confirm'))) {
      // 1. Optimistic Update: Immediately remove from UI
      const previousImages = [...images];
      setImages((prev) => prev.filter((img) => img.id !== id));

      // Close modal if deleting the currently viewed image
      if (selectedImage && selectedImage.id === id) {
        setSelectedImage(null);
      }

      try {
        // 2. Perform actual delete
        await deleteImageFromGallery(id);
      } catch (err) {
        console.error('Delete failed', err);
        alert(t('gallery.delete_error'));

        // 3. Rollback on error
        setImages(previousImages);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6 bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button
          onClick={onClose}
          type="button"
          className="p-2 rounded-full hover:bg-white/10 transition text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="font-bold">{t('gallery.camera')}</span>
        </button>
        <span className="font-bold text-lg">
          {t('gallery.title')} ({images.length})
        </span>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
            <ImageIcon className="w-16 h-16 mb-4" />
            <p>{t('gallery.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 pb-20">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative aspect-square bg-gray-900 overflow-hidden cursor-pointer active:opacity-80 transition group"
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.src}
                  alt={`Capture ${img.id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Delete Button on Thumbnail */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(img.id, e)}
                  className="absolute top-1 right-1 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-red-600 transition-colors z-20"
                >
                  <Trash2 className="w-4 h-4 pointer-events-none" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Image Preview Modal */}
      {selectedImage && (
        <div className="absolute inset-0 z-[60] bg-black flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <img
              src={selectedImage.src}
              alt="Full preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />

            {/* Toolbar overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="pointer-events-auto p-3 bg-white/10 text-white rounded-full backdrop-blur hover:bg-white/20"
              >
                <X className="w-6 h-6 pointer-events-none" />
              </button>

              <button
                type="button"
                onClick={(e) => handleDelete(selectedImage.id, e)}
                className="pointer-events-auto p-3 bg-red-500/80 text-white rounded-full backdrop-blur shadow-lg hover:bg-red-600"
              >
                <Trash2 className="w-6 h-6 pointer-events-none" />
              </button>
            </div>

            <div className="absolute bottom-8 text-xs text-gray-400 font-mono bg-black/40 px-3 py-1 rounded-full backdrop-blur pointer-events-none">
              {new Date(selectedImage.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
