/**
 * SkyCast - API Integration Module (Open-Meteo)
 * Free, no API key required, lifetime non-commercial use.
 * Docs: https://open-meteo.com/en/docs
 */

const API = (() => {
  const BASE_URL = 'https://api.open-meteo.com/v1';
  const GEO_URL = 'https://geocoding-api.open-meteo.com/v1';
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

  /**
   * Maps WMO weather codes to human-readable descriptions and icon IDs
   */
  const getWeatherInfo = (code, isDay = true) => {
    const map = {
      0:  { desc: 'Clear sky', icon: isDay ? '01d' : '01n' },
      1:  { desc: 'Mainly clear', icon: isDay ? '01d' : '01n' },
      2:  { desc: 'Partly cloudy', icon: isDay ? '02d' : '02n' },
      3:  { desc: 'Overcast', icon: '04d' },
      45: { desc: 'Foggy', icon: '50d' },
      48: { desc: 'Depositing rime fog', icon: '50d' },
      51: { desc: 'Light drizzle', icon: '09d' },
      53: { desc: 'Moderate drizzle', icon: '09d' },
      55: { desc: 'Dense drizzle', icon: '09d' },
      56: { desc: 'Freezing drizzle', icon: '09d' },
      57: { desc: 'Freezing drizzle', icon: '09d' },
      61: { desc: 'Slight rain', icon: '10d' },
      63: { desc: 'Moderate rain', icon: '10d' },
      65: { desc: 'Heavy rain', icon: '10d' },
      66: { desc: 'Freezing rain', icon: '13d' },
      67: { desc: 'Freezing rain', icon: '13d' },
      71: { desc: 'Slight snow', icon: '13d' },
      73: { desc: 'Moderate snow', icon: '13d' },
      75: { desc: 'Heavy snow', icon: '13d' },
      77: { desc: 'Snow grains', icon: '13d' },
      80: { desc: 'Rain showers', icon: '09d' },
      81: { desc: 'Rain showers', icon: '09d' },
      82: { desc: 'Rain showers', icon: '09d' },
      85: { desc: 'Snow showers', icon: '13d' },
      86: { desc: 'Snow showers', icon: '13d' },
      95: { desc: 'Thunderstorm', icon: '11d' },
      96: { desc: 'Thunderstorm', icon: '11d' },
      99: { desc: 'Thunderstorm', icon: '11d' }
    };
    return map[code] || { desc: 'Unknown', icon: '01d' };
  };

  /**
   * Returns a friendly weather description for a WMO code
   */
  const getFriendlyCondition = (code, isDay = true) => {
    const info = getWeatherInfo(code, isDay);
    const vibes = {
      'Clear sky': 'Perfect blue skies ahead',
      'Mainly clear': 'Mostly sunny with a few clouds',
      'Partly cloudy': 'A mix of sun and clouds',
      'Overcast': 'Cloudy skies overhead',
      'Foggy': 'Misty out there, drive safe',
      'Depositing rime fog': 'Thick fog with icy patches',
      'Light drizzle': 'A light drizzle falling',
      'Moderate drizzle': 'Steady drizzle coming down',
      'Dense drizzle': 'Heavy drizzle, grab a jacket',
      'Freezing drizzle': 'Icy drizzle — watch your step',
      'Slight rain': 'Light rain tapping on windows',
      'Moderate rain': 'Rain coming down steadily',
      'Heavy rain': 'Pouring out there!',
      'Rain showers': 'Showers passing through',
      'Slight snow': 'A few snowflakes drifting down',
      'Moderate snow': 'Snow falling, winter is here',
      'Heavy snow': 'Heavy snowfall, stay warm',
      'Snow showers': 'Snow showers blowing through',
      'Snow grains': 'Tiny ice crystals in the air',
      'Freezing rain': 'Freezing rain — roads may be slick',
      'Thunderstorm': 'Thunder rumbling, stay indoors'
    };
    return vibes[info.desc] || info.desc;
  };

  /**
   * Geocode using Nominatim (OSM) — covers almost any place on earth
   */
  const geocodeWithNominatim = async (query) => {
    const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SkyCast/1.0' } });
    const data = await res.json();
    if (!data || data.length === 0) return null;
    const r = data[0];
    const addr = r.address || {};
    return {
      name: addr.city || addr.town || addr.village || addr.hamlet || addr.county || addr.state || r.display_name.split(',')[0],
      country_code: addr.country_code || '',
      timezone: r.timezone || 'auto',
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon)
    };
  };

  /**
   * Geocode a location name to coordinates (Open-Meteo + Nominatim fallback)
   */
  const geocodeCity = async (city) => {
    if (!city || !city.trim()) {
      throw new Error('Please enter a city name to search');
    }

    // Try Open-Meteo first
    const url = `${GEO_URL}/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          return data.results[0];
        }
      }
    } catch {}

    // Fallback to Nominatim (covers villages, hamlets, landmarks, etc.)
    const fallback = await geocodeWithNominatim(city);
    if (fallback) return fallback;

    throw new Error(`Hmm, we couldn't find "${city}". Double-check the spelling?`);
  };

  /**
   * Fetches all weather data for given coordinates
   */
  const fetchWeatherData = async (lat, lon, timezone = 'auto') => {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,precipitation',
      hourly: 'temperature_2m,weathercode,precipitation_probability',
      daily: 'temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant',
      temperature_unit: 'celsius',
      wind_speed_unit: 'ms',
      precipitation_unit: 'mm',
      timezone,
      forecast_days: 6
    });

    const url = `${BASE_URL}/forecast?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch weather data. Please try again.');
    }

    return await response.json();
  };

  /**
   * Gets current weather by city name
   */
  const getCurrentWeather = async (city, units = 'metric') => {
    const geo = await geocodeCity(city);
    const data = await fetchWeatherData(geo.latitude, geo.longitude, geo.timezone);
    const c = data.current;
    const isDay = c.weathercode !== undefined;
    const weather = getWeatherInfo(c.weathercode, isDay);

    return {
      name: geo.name,
      country: geo.country_code?.toUpperCase() || '',
      sys: { country: geo.country_code?.toUpperCase() || '' },
      main: {
        temp: c.temperature_2m,
        feels_like: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        pressure: c.surface_pressure
      },
      wind: {
        speed: c.wind_speed_10m,
        deg: c.wind_direction_10m
      },
      weather: [{
        main: weather.desc,
        description: weather.desc,
        icon: weather.icon,
        id: c.weathercode
      }],
      clouds: { all: c.cloud_cover },
      rain: { '1h': c.precipitation },
      coord: { lat: geo.latitude, lon: geo.longitude },
      timezone: geo.timezone || 'UTC',
      friendly: getFriendlyCondition(c.weathercode, isDay)
    };
  };

  /**
   * Reverse geocode coordinates to city name using Nominatim (OSM)
   */
  const reverseGeocode = async (lat, lon) => {
    try {
      const url = `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=en`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SkyCast/1.0' } });
      const data = await res.json();
      if (data && data.address) {
        return data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
      }
    } catch {}
    return null;
  };

  /**
   * Gets current weather by coordinates (with reverse geocoding)
   */
  const getCurrentWeatherByCoords = async (lat, lon, units = 'metric') => {
    const data = await fetchWeatherData(lat, lon);
    const c = data.current;
    const weather = getWeatherInfo(c.weathercode, true);
    const cityName = await reverseGeocode(lat, lon);

    return {
      name: cityName || '',
      country: '',
      sys: { country: '' },
      main: {
        temp: c.temperature_2m,
        feels_like: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        pressure: c.surface_pressure
      },
      wind: {
        speed: c.wind_speed_10m,
        deg: c.wind_direction_10m
      },
      weather: [{
        main: weather.desc,
        description: weather.desc,
        icon: weather.icon,
        id: c.weathercode
      }],
      clouds: { all: c.cloud_cover },
      rain: { '1h': c.precipitation },
      coord: { lat, lon },
      timezone: 'UTC',
      friendly: getFriendlyCondition(c.weathercode, true)
    };
  };

  /**
   * Gets forecast data by city name
   */
  const getForecast = async (city, units = 'metric') => {
    const geo = await geocodeCity(city);
    const data = await fetchWeatherData(geo.latitude, geo.longitude, geo.timezone);

    return {
      daily: data.daily,
      hourly: data.hourly,
      geo
    };
  };

  /**
   * Gets forecast data by coordinates
   */
  const getForecastByCoords = async (lat, lon, units = 'metric') => {
    const data = await fetchWeatherData(lat, lon);

    return {
      daily: data.daily,
      hourly: data.hourly,
      geo: null
    };
  };

  /**
   * Search cities for autocomplete suggestions
   */
  const searchCities = async (query) => {
    if (!query || query.length < 2) return [];
    const results = [];

    // Open-Meteo suggestions
    try {
      const url = `${GEO_URL}/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results) {
        data.results.forEach(r => results.push({
          name: r.name,
          country: r.country,
          admin: r.admin1 || ''
        }));
      }
    } catch {}

    // Also fetch from Nominatim for small places Open-Meteo misses
    try {
      const url2 = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=en`;
      const res2 = await fetch(url2, { headers: { 'User-Agent': 'SkyCast/1.0' } });
      const data2 = await res2.json();
      if (data2) {
        data2.forEach(r => {
          const addr = r.address || {};
          const name = addr.city || addr.town || addr.village || addr.hamlet || addr.county || addr.state || r.display_name.split(',')[0];
          const country = addr.country || '';
          const admin = addr.state || addr.county || '';
          if (!results.some(ex => ex.name.toLowerCase() === name.toLowerCase())) {
            results.push({ name, country, admin });
          }
        });
      }
    } catch {}

    return results.slice(0, 10);
  };

  /**
   * Sri Lanka city database for instant accurate results
   */
  const SRI_LANKA_CITIES = {
    'colombo': { lat: 6.9271, lon: 79.8612, name: 'Colombo' },
    'kandy': { lat: 7.2906, lon: 80.6337, name: 'Kandy' },
    'galle': { lat: 6.0535, lon: 80.2210, name: 'Galle' },
    'jaffna': { lat: 9.6615, lon: 80.0255, name: 'Jaffna' },
    'negombo': { lat: 7.2083, lon: 79.8358, name: 'Negombo' },
    'anuradhapura': { lat: 8.3114, lon: 80.4037, name: 'Anuradhapura' },
    'polonnaruwa': { lat: 7.9403, lon: 81.0188, name: 'Polonnaruwa' },
    'trincomalee': { lat: 8.5874, lon: 81.2152, name: 'Trincomalee' },
    'batticaloa': { lat: 7.7102, lon: 81.6924, name: 'Batticaloa' },
    'matara': { lat: 5.9549, lon: 80.5550, name: 'Matara' },
    'ratnapura': { lat: 6.7056, lon: 80.3848, name: 'Ratnapura' },
    'badulla': { lat: 6.9934, lon: 81.0550, name: 'Badulla' },
    'kurunegala': { lat: 7.4818, lon: 80.3623, name: 'Kurunegala' },
    'matale': { lat: 7.4694, lon: 80.6233, name: 'Matale' },
    'nuwara eliya': { lat: 6.9707, lon: 80.7829, name: 'Nuwara Eliya' },
    'kegalle': { lat: 7.2523, lon: 80.3460, name: 'Kegalle' },
    'kalutara': { lat: 6.5853, lon: 79.9607, name: 'Kalutara' },
    'puttalam': { lat: 8.0412, lon: 79.8484, name: 'Puttalam' },
    'gampaha': { lat: 7.0845, lon: 80.0098, name: 'Gampaha' },
    'hambantota': { lat: 6.1429, lon: 81.1190, name: 'Hambantota' },
    'mannar': { lat: 8.9825, lon: 79.9138, name: 'Mannar' },
    'vavuniya': { lat: 8.7550, lon: 80.4975, name: 'Vavuniya' },
    'kilinochchi': { lat: 9.3861, lon: 80.4090, name: 'Kilinochchi' },
    'moratuwa': { lat: 6.7731, lon: 79.8825, name: 'Moratuwa' },
    'mount lavinia': { lat: 6.8752, lon: 79.8671, name: 'Mount Lavinia' },
    'dehiwala': { lat: 6.8532, lon: 79.8578, name: 'Dehiwala' },
    'sri jayewardenepura': { lat: 6.8868, lon: 79.9187, name: 'Sri Jayewardenepura Kotte' }
  };

  const getSriLankaCity = (name) => SRI_LANKA_CITIES[name.toLowerCase().trim()] || null;

  /**
   * Smart weather-based suggestions (what to wear, what to carry)
   */
  const getWeatherSuggestions = (weatherData, forecastData) => {
    const main = weatherData.main;
    const weather = weatherData.weather[0];
    const wind = weatherData.wind;
    const temp = main.temp;
    const feelsLike = main.feels_like;
    const humidity = main.humidity;
    const condition = (weather.main || '').toLowerCase();
    const code = weather.id;
    const isRain = condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm') || [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code);
    const isSnow = condition.includes('snow') || [71,73,75,77,85,86].includes(code);
    const isThunder = condition.includes('thunder') || [95,96,99].includes(code);
    const isFog = condition.includes('fog') || condition.includes('mist') || condition.includes('haze') || [45,48].includes(code);
    const cloudCover = weatherData.clouds?.all || 0;
    const uv = forecastData?.daily?.uv_index_max?.[0] || 0;
    const rainProb = forecastData?.daily?.precipitation_probability_max?.[0] || 0;
    const windSpeed = wind?.speed || 0;
    const suggestions = [];

    // Temperature-based
    if (temp >= 35) suggestions.push({ icon: '\uD83D\uDD25', text: 'Extreme heat! Stay indoors, avoid direct sun, drink plenty of water' });
    else if (temp >= 30) suggestions.push({ icon: '\u2600\uFE0F', text: 'Very hot! Wear light cotton clothes, stay hydrated, use sunscreen' });
    else if (temp >= 28) suggestions.push({ icon: '\uD83D\uDC60', text: 'Warm day. Light clothing, sunglasses, and flip-flops recommended' });
    else if (temp >= 22) suggestions.push({ icon: '\uD83D\uDC54', text: 'Pleasant weather. A light t-shirt and jeans will be comfortable' });
    else if (temp >= 16) suggestions.push({ icon: '\uD83E\uDD7A', text: 'Mild and cool. Bring a light jacket or hoodie' });
    else if (temp >= 10) suggestions.push({ icon: '\uD83E\uDD7C', text: 'Chilly! Wear a sweater or warm jacket' });
    else suggestions.push({ icon: '\uD83E\uDD76', text: 'Brr, cold! Bundle up with a heavy coat, scarf, and gloves' });

    // Feels like difference
    if (feelsLike && Math.abs(temp - feelsLike) > 3) {
      if (feelsLike < temp) suggestions.push({ icon: '\uD83C\uDF2C\uFE0F', text: `Feels colder (${Math.round(feelsLike)}\u00B0) than actual temp — wind chill is real!` });
      else suggestions.push({ icon: '\uD83D\uDCA8', text: `Feels warmer (${Math.round(feelsLike)}\u00B0) — humidity is making it muggy` });
    }

    // Rain
    if (isRain || rainProb >= 50) {
      if (rainProb >= 80) suggestions.push({ icon: '\u2614', text: 'Heavy rain expected! Definitely carry an umbrella and wear waterproof shoes' });
      else if (rainProb >= 50) suggestions.push({ icon: '\u2614', text: `${rainProb}% chance of rain — better carry an umbrella just in case` });
      else suggestions.push({ icon: '\u2602\uFE0F', text: 'Rain in the forecast. Grab your umbrella before heading out' });
    }

    if (isThunder) suggestions.push({ icon: '\u26A1', text: 'Thunderstorms! Stay indoors, avoid open areas, unplug electronics' });
    if (isSnow) suggestions.push({ icon: '\u2744\uFE0F', text: 'Snowfall! Wear warm boots, a heavy coat, and drive carefully' });
    if (isFog) suggestions.push({ icon: '\uD83C\uDF2B\uFE0F', text: 'Foggy out there. Drive with low beams and leave extra travel time' });

    // Wind
    if (windSpeed >= 15) suggestions.push({ icon: '\uD83D\uDCA8', text: 'Very windy! Secure loose items, avoid beach areas, hold onto your hat' });
    else if (windSpeed >= 10) suggestions.push({ icon: '\uD83C\uDF2C\uFE0F', text: 'Windy conditions. Good day for kite flying, not so much for umbrellas' });

    // UV
    if (uv >= 8) suggestions.push({ icon: '\uD83D\uDD25', text: 'Extreme UV! Avoid going out between 11AM-3PM, SPF 50+ a must' });
    else if (uv >= 6) suggestions.push({ icon: '\uD83D\uDC5F', text: 'High UV! Wear sunscreen, a hat, and sunglasses' });
    else if (uv >= 3) suggestions.push({ icon: '\uD83D\uDC60', text: 'Moderate UV. Sunscreen recommended if you will be outside' });

    // Humidity
    if (humidity > 80) suggestions.push({ icon: '\uD83D\uDCA7', text: 'Very humid! Light breathable fabrics will help you stay comfortable' });

    // Cloud cover
    if (cloudCover > 80 && !isRain && !isSnow) suggestions.push({ icon: '\u2601\uFE0F', text: 'Overcast all day. A grey day — great for indoor activities' });

    // Perfect weather
    if (temp >= 20 && temp <= 28 && !isRain && uv < 6 && windSpeed < 8) {
      suggestions.push({ icon: '\uD83C\uDF1E', text: 'Perfect weather! Go outside, enjoy the sun, have a picnic!' });
    }

    return suggestions.slice(0, 4);
  };

  /**
   * Generate a funny error message
   */
  const getFunnyError = (type) => {
    const messages = {
      not_found: [
        "Oops! That city seems to have vanished \uD83C\uDF0D",
        "We checked every map — couldn't find that one \uD83D\uDD0D",
        "Did you spell it right? Even we're confused \uD83E\uDD14",
        "That city must be shy, it's hiding from us \uD83D\uDE35\u200D\uD83D\uDCAB",
        "Plot twist: that city doesn't exist \uD83C\uDFAD"
      ],
      network: [
        "Our weather satellites are taking a nap \uD83D\uDE34",
        "Lost connection to the clouds \u2601\uFE0F\u200D\uD83D\uDCA8",
        "The internet gnomes are on strike again \uD83E\uDDDC\u200D\u2642\uFE0F",
        "Can't reach the weather servers right now \uD83D\uDCF6"
      ],
      empty: [
        "Type a city name first, then we'll talk weather \uD83D\uDE09",
        "I need a city to work with! \uD83C\uDFD9\uFE0F",
        "Search bar isn't for decoration — type something! \uD83D\uDE43"
      ]
    };
    const pool = messages[type] || messages.not_found;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  return {
    getCurrentWeather,
    getCurrentWeatherByCoords,
    getForecast,
    getForecastByCoords,
    getWeatherInfo,
    getFriendlyCondition,
    fetchWeatherData,
    searchCities,
    getFunnyError,
    getWeatherSuggestions,
    getSriLankaCity,
    SRI_LANKA_CITIES
  };
})();
