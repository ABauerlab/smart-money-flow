import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedImage {
  name: string;
  base64: string;
  type: string;
  preview: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  disabled?: boolean;
}

export const ImageUploader = ({ images, onImagesChange, disabled }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(async (files: FileList) => {
    const newImages: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });
      const preview = URL.createObjectURL(file);
      newImages.push({ name: file.name, base64, type: file.type, preview });
    }
    onImagesChange([...images, ...newImages]);
  }, [images, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [disabled, processFiles]);

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => {
          if (disabled) return;
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'image/*';
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) processFiles(files);
          };
          input.click();
        }}
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Arraste imagens de gráficos ou <span className="text-primary">clique para selecionar</span>
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WEBP • Múltiplas imagens</p>
      </div>

      <AnimatePresence>
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img, i) => (
              <motion.div
                key={img.name + i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group rounded-lg overflow-hidden border border-border/50"
              >
                <img src={img.preview} alt={`Pré-visualização do gráfico de criptomoeda: ${img.name}`} className="w-full h-24 object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-background/80 px-2 py-1">
                  <p className="text-[10px] text-foreground/70 truncate">{img.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
