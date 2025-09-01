import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Property {
  id: string;
  title: string;
  description?: string;
  price: number;
  property_type: string;
  status: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  location: string;
  address?: string;
  city: string;
  state: string;
  pincode?: string;
  amenities?: string[];
  images?: string[];
  latitude?: number;
  longitude?: number;
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string;
  };
}

interface PropertyMapProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
  height?: string;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  selectedProperty,
  onPropertySelect,
  height = '400px'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { toast } = useToast();
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    // Use the provided Mapbox token
    const token = 'pk.eyJ1IjoiaGFyc2hpdGgxNzc3IiwiYSI6ImNtZjB6bWJ4NjF3djQyc3F5MjFmdzlqZmYifQ.5pUn3owcvM61Mb_oW4rrtw';
    setMapboxToken(token);
    initializeMap(token);
  }, []);

  useEffect(() => {
    if (map.current && mapboxToken) {
      updateMapMarkers();
    }
  }, [properties, mapboxToken]);

  useEffect(() => {
    if (map.current && selectedProperty && selectedProperty.latitude && selectedProperty.longitude) {
      map.current.flyTo({
        center: [selectedProperty.longitude, selectedProperty.latitude],
        zoom: 15,
        duration: 2000
      });
    }
  }, [selectedProperty]);

  const initializeMap = (token: string) => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [77.2090, 28.6139], // Default to Delhi, India
      zoom: 10,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    map.current.on('load', () => {
      updateMapMarkers();
    });
  };

  const updateMapMarkers = () => {
    if (!map.current) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.property-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add markers for properties with coordinates
    properties.forEach(property => {
      if (!property.latitude || !property.longitude) return;

      // Create marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'property-marker';
      markerElement.style.cssText = `
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: hsl(var(--primary));
        border: 2px solid white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      
      const priceInLakhs = property.price / 100000;
      markerElement.textContent = priceInLakhs >= 1 ? `₹${priceInLakhs.toFixed(0)}L` : `₹${property.price/1000}K`;

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2">
          <h3 class="font-semibold text-sm">${property.title}</h3>
          <p class="text-xs text-gray-600">${property.location}</p>
          <p class="text-xs font-medium">₹${property.price.toLocaleString('en-IN')}</p>
          <p class="text-xs">${property.property_type} • ${property.status}</p>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([property.longitude, property.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Handle marker click
      markerElement.addEventListener('click', () => {
        onPropertySelect?.(property);
      });
    });

    // Fit bounds to show all properties
    if (properties.length > 0) {
      const validProperties = properties.filter(p => p.latitude && p.longitude);
      if (validProperties.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validProperties.forEach(property => {
          bounds.extend([property.longitude!, property.latitude!]);
        });
        map.current!.fitBounds(bounds, { padding: 50 });
      }
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken.trim()) {
      localStorage.setItem('mapbox_token', mapboxToken);
      setShowTokenInput(false);
      initializeMap(mapboxToken);
      toast({
        title: 'Success',
        description: 'Mapbox token saved and map initialized',
      });
    }
  };

  const getMapboxTokenUrl = () => {
    return 'https://account.mapbox.com/access-tokens/';
  };

  if (showTokenInput) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Property Map Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To display the property map, please enter your Mapbox public token.
            </p>
            <form onSubmit={handleTokenSubmit} className="space-y-3">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Mapbox public token (pk.ey...)"
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Get your token from{' '}
                  <a 
                    href={getMapboxTokenUrl()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Mapbox Dashboard
                  </a>
                </p>
              </div>
              <Button type="submit" className="w-full">
                Initialize Map
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Properties Map
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTokenInput(true)}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={mapContainer} 
          className="w-full rounded-b-lg"
          style={{ height }}
        />
      </CardContent>
    </Card>
  );
};