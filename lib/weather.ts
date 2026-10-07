// Weather via Open-Meteo (free, no API key)
// Geocoding: https://geocoding-api.open-meteo.com/v1/search
// Forecast: https://api.open-meteo.com/v1/forecast

type CachedWeather = {
  tempF: number;
  code: number;
  fetchedAt: number;
};

type CachedGeo = {
  lat: number;
  lon: number;
  fetchedAt: number;
};

const geoCache = new Map<string, CachedGeo>();
const weatherCache = new Map<string, CachedWeather>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Skip generic/non-geocodable locations
const SKIP_PATTERNS = /^(home|zoom|office|online|tbd|n\/a)$/i;

function weatherCodeToIcon(code: number): string {
  if (code === 0) return "wb-sunny";
  if (code <= 3) return "partly-cloudy-day";
  if (code <= 48) return "foggy";
  if (code <= 67) return "rainy";
  if (code <= 77) return "ac-unit"; // snow
  if (code <= 82) return "rainy";
  if (code <= 86) return "ac-unit";
  return "thunderstorm";
}

function weatherCodeToLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow";
  return "Storm";
}

async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  if (SKIP_PATTERNS.test(location.trim())) return null;
  
  const cached = geoCache.get(location);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { lat: cached.lat, lon: cached.lon };
  }

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    const data = await res.json();
    if (data.results?.[0]) {
      const { latitude, longitude } = data.results[0];
      geoCache.set(location, { lat: latitude, lon: longitude, fetchedAt: Date.now() });
      return { lat: latitude, lon: longitude };
    }
  } catch (e) {
    console.warn("Geocode failed:", e);
  }
  return null;
}

export type WeatherInfo = {
  tempF: number;
  icon: string;
  label: string;
};

export async function getWeatherForLocation(location: string): Promise<WeatherInfo | null> {
  if (!location || SKIP_PATTERNS.test(location.trim())) return null;

  const coords = await geocode(location);
  if (!coords) return null;

  const cacheKey = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return {
      tempF: cached.tempF,
      icon: weatherCodeToIcon(cached.code),
      label: weatherCodeToLabel(cached.code),
    };
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
    );
    const data = await res.json();
    if (data.current) {
      const tempF = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      weatherCache.set(cacheKey, { tempF, code, fetchedAt: Date.now() });
      return {
        tempF,
        icon: weatherCodeToIcon(code),
        label: weatherCodeToLabel(code),
      };
    }
  } catch (e) {
    console.warn("Weather fetch failed:", e);
  }
  return null;
}
