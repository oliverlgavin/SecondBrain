'use client';

interface TaskMapProps {
  location: string;
  userLocation?: {
    latitude: number | null;
    longitude: number | null;
  };
  className?: string;
}

export function TaskMap({ location, userLocation, className = '' }: TaskMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className={`bg-[var(--background-tertiary)] rounded-lg flex items-center justify-center text-[var(--foreground-muted)] ${className}`}>
        <p className="text-sm">Map unavailable - API key not configured</p>
      </div>
    );
  }

  const encodedLocation = encodeURIComponent(location);

  // Use directions mode if we have user location, otherwise use place mode
  let mapUrl: string;

  if (userLocation?.latitude && userLocation?.longitude) {
    // Directions mode shows both user location and destination with route
    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin}&destination=${encodedLocation}&mode=driving`;
  } else {
    // Fallback to place mode if no user location
    mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedLocation}&zoom=14`;
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={mapUrl}
        className="w-full h-full border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Task location map"
      />
    </div>
  );
}

export function TaskMapPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[var(--background-tertiary)] rounded-lg flex items-center justify-center ${className}`}>
      <div className="text-center text-[var(--foreground-muted)]">
        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">No location set</p>
      </div>
    </div>
  );
}
