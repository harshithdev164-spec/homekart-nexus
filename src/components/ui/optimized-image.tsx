import React, { useState, useEffect } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with lazy loading and placeholder support
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3C/svg%3E',
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { targetRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.01,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (loading === 'eager' || hasIntersected) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
        onLoad?.();
      };
      
      img.onerror = () => {
        setImageError(true);
        onError?.();
      };
      
      img.src = src;
    }
  }, [src, hasIntersected, loading, onLoad, onError]);

  if (imageError) {
    return (
      <div
        ref={targetRef}
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width, height }}
      >
        <span className="text-muted-foreground text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div ref={targetRef} className="relative">
      <img
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        width={width}
        height={height}
        loading={loading}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="animate-pulse">Loading...</div>
        </div>
      )}
    </div>
  );
};

/**
 * Image gallery component with lazy loading
 */
interface OptimizedImageGalleryProps {
  images: string[];
  className?: string;
  thumbnailClass?: string;
  onImageClick?: (index: number) => void;
}

export const OptimizedImageGallery: React.FC<OptimizedImageGalleryProps> = ({
  images,
  className = '',
  thumbnailClass = '',
  onImageClick,
}) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {images.map((src, index) => (
        <div
          key={index}
          className={`cursor-pointer overflow-hidden rounded-lg ${thumbnailClass}`}
          onClick={() => onImageClick?.(index)}
        >
          <OptimizedImage
            src={src}
            alt={`Image ${index + 1}`}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        </div>
      ))}
    </div>
  );
};
