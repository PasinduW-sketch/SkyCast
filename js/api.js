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
    const q = query.toLowerCase().trim();

    // Matches from Sri Lanka local database (instant, no network)
    SRI_LANKA_PLACES.forEach(p => {
      if (p.k.some(key => key.includes(q))) {
        if (!results.some(r => r.name.toLowerCase() === p.v.name.toLowerCase())) {
          results.push({ name: p.v.name, country: 'Sri Lanka', admin: '' });
        }
      }
    });

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
   * Sri Lanka comprehensive location database — all districts, towns, villages
   */
  const SRI_LANKA_PLACES = [
    // Western Province
    { k: ['colombo', 'kolamba'], v: { name: 'Colombo', lat: 6.9271, lon: 79.8612 } },
    { k: ['dehiwala', 'dehiwala mount lavinia'], v: { name: 'Dehiwala', lat: 6.8532, lon: 79.8578 } },
    { k: ['mount lavinia', 'mt lavinia'], v: { name: 'Mount Lavinia', lat: 6.8752, lon: 79.8671 } },
    { k: ['moratuwa'], v: { name: 'Moratuwa', lat: 6.7731, lon: 79.8825 } },
    { k: ['sri jayewardenepura', 'kotte', 'sri jayawardenepura'], v: { name: 'Sri Jayewardenepura Kotte', lat: 6.8868, lon: 79.9187 } },
    { k: ['negombo', 'megomuwa'], v: { name: 'Negombo', lat: 7.2083, lon: 79.8358 } },
    { k: ['gampaha'], v: { name: 'Gampaha', lat: 7.0845, lon: 80.0098 } },
    { k: ['kalutara'], v: { name: 'Kalutara', lat: 6.5853, lon: 79.9607 } },
    { k: ['battaramulla'], v: { name: 'Battaramulla', lat: 6.8984, lon: 79.9221 } },
    { k: ['rathmalana', 'ratmalana'], v: { name: 'Ratmalana', lat: 6.8220, lon: 79.8777 } },
    { k: ['nugegoda'], v: { name: 'Nugegoda', lat: 6.8625, lon: 79.8997 } },
    { k: ['maharagama'], v: { name: 'Maharagama', lat: 6.8488, lon: 79.9143 } },
    { k: ['boralesgamuwa'], v: { name: 'Boralesgamuwa', lat: 6.8346, lon: 79.8950 } },
    { k: ['panadura'], v: { name: 'Panadura', lat: 6.7134, lon: 79.9039 } },
    { k: ['jaela', 'ja-ela'], v: { name: 'Ja-Ela', lat: 7.0930, lon: 79.8920 } },
    { k: ['kandana'], v: { name: 'Kandana', lat: 7.0530, lon: 79.8820 } },
    { k: ['wattala'], v: { name: 'Wattala', lat: 6.9884, lon: 79.8899 } },
    { k: ['kelaniya'], v: { name: 'Kelaniya', lat: 6.9553, lon: 79.9222 } },
    { k: ['wellawatta', 'wellawaththa'], v: { name: 'Wellawatta', lat: 6.8744, lon: 79.8621 } },
    { k: ['bambalapitiya'], v: { name: 'Bambalapitiya', lat: 6.8853, lon: 79.8575 } },
    { k: ['kollupitiya', 'colpetty'], v: { name: 'Kollupitiya', lat: 6.8976, lon: 79.8525 } },
    { k: ['slave island', 'kompani vidiya'], v: { name: 'Slave Island', lat: 6.9186, lon: 79.8470 } },
    { k: ['horethuduwa'], v: { name: 'Horathuduwa', lat: 6.6500, lon: 79.9700 } },
    { k: ['horana'], v: { name: 'Horana', lat: 6.7200, lon: 80.0600 } },
    { k: ['ingiriya'], v: { name: 'Ingiriya', lat: 6.7300, lon: 80.1600 } },
    { k: ['madampe', 'madampe western'], v: { name: 'Madampe', lat: 7.5000, lon: 79.8300 } },
    { k: ['minuwangoda'], v: { name: 'Minuwangoda', lat: 7.1667, lon: 79.9583 } },
    { k: ['veyangoda'], v: { name: 'Veyangoda', lat: 7.1500, lon: 80.0500 } },
    { k: ['divulapitiya'], v: { name: 'Divulapitiya', lat: 7.2333, lon: 80.0000 } },
    { k: ['meepe'], v: { name: 'Meepe', lat: 6.8200, lon: 80.0400 } },
    { k: ['padukka'], v: { name: 'Padukka', lat: 6.8400, lon: 80.0800 } },

    // Central Province
    { k: ['kandy', 'mahanuwara'], v: { name: 'Kandy', lat: 7.2906, lon: 80.6337 } },
    { k: ['matale'], v: { name: 'Matale', lat: 7.4694, lon: 80.6233 } },
    { k: ['nuwara eliya', 'nuwaraeliya'], v: { name: 'Nuwara Eliya', lat: 6.9707, lon: 80.7829 } },
    { k: ['gampola'], v: { name: 'Gampola', lat: 7.1667, lon: 80.5667 } },
    { k: ['nawalapitiya'], v: { name: 'Nawalapitiya', lat: 7.0500, lon: 80.5333 } },
    { k: ['talawakelle'], v: { name: 'Talawakelle', lat: 6.9370, lon: 80.6570 } },
    { k: ['hatton'], v: { name: 'Hatton', lat: 6.8990, lon: 80.5980 } },
    { k: ['maskeliya'], v: { name: 'Maskeliya', lat: 6.8333, lon: 80.5667 } },
    { k: ['kadugannawa'], v: { name: 'Kadugannawa', lat: 7.2667, lon: 80.5167 } },
    { k: ['peradeniya'], v: { name: 'Peradeniya', lat: 7.2667, lon: 80.6000 } },
    { k: ['wattegama', 'wattegama central'], v: { name: 'Wattegama', lat: 7.3500, lon: 80.6833 } },
    { k: ['akurana'], v: { name: 'Akurana', lat: 7.3667, lon: 80.6167 } },
    { k: ['katharagama', 'katagarama'], v: { name: 'Katharagama', lat: 6.8500, lon: 80.6500 } },
    { k: ['digana'], v: { name: 'Digana', lat: 7.2833, lon: 80.7333 } },
    { k: ['teldeniya'], v: { name: 'Teldeniya', lat: 7.3000, lon: 80.7667 } },
    { k: ['dambulla'], v: { name: 'Dambulla', lat: 7.8600, lon: 80.6500 } },
    { k: ['sigiriya'], v: { name: 'Sigiriya', lat: 7.9570, lon: 80.7600 } },
    { k: ['habarana'], v: { name: 'Habarana', lat: 8.0436, lon: 80.7425 } },
    { k: ['naula'], v: { name: 'Naula', lat: 7.7000, lon: 80.6500 } },
    { k: ['ratthota'], v: { name: 'Rattota', lat: 7.5167, lon: 80.6667 } },
    { k: ['wilgamuwa'], v: { name: 'Wilgamuwa', lat: 7.3500, lon: 80.8333 } },
    { k: ['ambanpola'], v: { name: 'Ambanpola', lat: 7.9000, lon: 80.5000 } },
    { k: ['lindula'], v: { name: 'Lindula', lat: 6.9167, lon: 80.6833 } },
    { k: ['agarapathana', 'agrapatana'], v: { name: 'Agarapathana', lat: 6.8730, lon: 80.6900 } },
    { k: ['nildandahinna'], v: { name: 'Nildandahinna', lat: 7.0000, lon: 80.8500 } },
    { k: ['kothmale', 'kotmale'], v: { name: 'Kotmale', lat: 7.0000, lon: 80.6000 } },
    { k: ['pundaluoya'], v: { name: 'Pundaluoya', lat: 6.9700, lon: 80.6600 } },

    // Southern Province
    { k: ['galle'], v: { name: 'Galle', lat: 6.0535, lon: 80.2210 } },
    { k: ['matara'], v: { name: 'Matara', lat: 5.9549, lon: 80.5550 } },
    { k: ['hambantota'], v: { name: 'Hambantota', lat: 6.1429, lon: 81.1190 } },
    { k: ['bentota'], v: { name: 'Bentota', lat: 6.4260, lon: 80.0054 } },
    { k: ['hikkaduwa'], v: { name: 'Hikkaduwa', lat: 6.1471, lon: 80.1011 } },
    { k: ['unawatuna'], v: { name: 'Unawatuna', lat: 6.0186, lon: 80.2506 } },
    { k: ['weligama'], v: { name: 'Weligama', lat: 5.9700, lon: 80.4200 } },
    { k: ['mirissa'], v: { name: 'Mirissa', lat: 5.9460, lon: 80.4530 } },
    { k: ['ahangama'], v: { name: 'Ahangama', lat: 5.9750, lon: 80.3625 } },
    { k: ['koggala', 'koggala beach'], v: { name: 'Koggala', lat: 5.9900, lon: 80.3267 } },
    { k: ['dikwella', 'dickwella'], v: { name: 'Dikwella', lat: 5.9667, lon: 80.6833 } },
    { k: ['tanggalle', 'tangalla', 'tangalle'], v: { name: 'Tangalle', lat: 6.0333, lon: 80.7833 } },
    { k: ['ambalangoda'], v: { name: 'Ambalangoda', lat: 6.2333, lon: 80.0500 } },
    { k: ['balapitiya'], v: { name: 'Balapitiya', lat: 6.2667, lon: 80.0333 } },
    { k: ['deniyaya'], v: { name: 'Deniyaya', lat: 6.3319, lon: 80.5583 } },
    { k: ['eliyakanda', 'elliyakanda'], v: { name: 'Eliyakanda', lat: 6.0000, lon: 80.4000 } },
    { k: ['hakmana'], v: { name: 'Hakmana', lat: 6.0833, lon: 80.6500 } },
    { k: ['kamburupitiya'], v: { name: 'Kamburupitiya', lat: 6.0833, lon: 80.5500 } },
    { k: ['akkaraipattu'], v: { name: 'Akkaraipattu', lat: 6.0500, lon: 80.4333 } },
    { k: ['tissamaharama', 'tissa'], v: { name: 'Tissamaharama', lat: 6.2833, lon: 81.2833 } },
    { k: ['kataragama'], v: { name: 'Kataragama', lat: 6.4167, lon: 81.3333 } },
    { k: ['beliatta'], v: { name: 'Beliatta', lat: 6.0500, lon: 80.7333 } },
    { k: ['urubokka', 'urubokke'], v: { name: 'Urubokka', lat: 6.3000, lon: 80.6333 } },
    { k: ['alutgama', 'aluthgama'], v: { name: 'Aluthgama', lat: 6.4333, lon: 80.0000 } },
    { k: ['hapitigala', 'haputugala'], v: { name: 'Hapitigala', lat: 6.2333, lon: 80.1500 } },

    // Eastern Province
    { k: ['trincomalee', 'trinco'], v: { name: 'Trincomalee', lat: 8.5874, lon: 81.2152 } },
    { k: ['batticaloa', 'batti'], v: { name: 'Batticaloa', lat: 7.7102, lon: 81.6924 } },
    { k: ['kalmunai'], v: { name: 'Kalmunai', lat: 7.4167, lon: 81.8167 } },
    { k: ['ampara'], v: { name: 'Ampara', lat: 7.2874, lon: 81.6685 } },
    { k: ['kinniya'], v: { name: 'Kinniya', lat: 8.4833, lon: 81.1833 } },
    { k: ['muttur'], v: { name: 'Muttur', lat: 8.4000, lon: 81.2667 } },
    { k: ['kantalai', 'kantale'], v: { name: 'Kantale', lat: 8.3667, lon: 81.0000 } },
    { k: ['nilaveli'], v: { name: 'Nilaveli', lat: 8.6833, lon: 81.1833 } },
    { k: ['uchchamunai'], v: { name: 'Uchchamunai', lat: 7.4500, lon: 81.7833 } },
    { k: ['eravur'], v: { name: 'Eravur', lat: 7.7750, lon: 81.6000 } },
    { k: ['kalkudah'], v: { name: 'Kalkudah', lat: 7.8833, lon: 81.5500 } },
    { k: ['passikudah', 'pasikuda'], v: { name: 'Passikudah', lat: 7.9167, lon: 81.5333 } },
    { k: ['valachchenai'], v: { name: 'Valachchenai', lat: 7.6333, lon: 81.7667 } },
    { k: ['oddamavadi'], v: { name: 'Oddamavadi', lat: 7.4333, lon: 81.7333 } },
    { k: ['pottuvil'], v: { name: 'Pottuvil', lat: 6.8833, lon: 81.8333 } },
    { k: ['arugam bay'], v: { name: 'Arugam Bay', lat: 6.8500, lon: 81.8333 } },
    { k: ['addalachchenai', 'addalaichenai'], v: { name: 'Addalachchenai', lat: 7.3000, lon: 81.7333 } },
    { k: ['samanthurai', 'sammanthurai'], v: { name: 'Samanthurai', lat: 7.3667, lon: 81.7833 } },
    { k: ['dehiattakandiya'], v: { name: 'Dehiattakandiya', lat: 7.5833, lon: 81.2333 } },
    { k: ['maha oya'], v: { name: 'Maha Oya', lat: 7.5667, lon: 81.3667 } },
    { k: ['damana'], v: { name: 'Damana', lat: 7.4167, lon: 81.6500 } },
    { k: ['navithanveli'], v: { name: 'Navithanveli', lat: 7.5333, lon: 81.7000 } },
    { k: ['chenkaladi'], v: { name: 'Chenkaladi', lat: 7.7500, lon: 81.6167 } },
    { k: ['vakarai'], v: { name: 'Vakarai', lat: 8.1333, lon: 81.4333 } },

    // Northern Province
    { k: ['jaffna', 'yapanaya'], v: { name: 'Jaffna', lat: 9.6615, lon: 80.0255 } },
    { k: ['mannar'], v: { name: 'Mannar', lat: 8.9825, lon: 79.9138 } },
    { k: ['vavuniya'], v: { name: 'Vavuniya', lat: 8.7550, lon: 80.4975 } },
    { k: ['kilinochchi'], v: { name: 'Kilinochchi', lat: 9.3861, lon: 80.4090 } },
    { k: ['mullaitivu', 'mullaittivu', 'mullativu'], v: { name: 'Mullaitivu', lat: 9.2670, lon: 80.8140 } },
    { k: ['point pedro'], v: { name: 'Point Pedro', lat: 9.8167, lon: 80.2333 } },
    { k: ['chavakachcheri', 'chavakacheri'], v: { name: 'Chavakachcheri', lat: 9.6500, lon: 80.1500 } },
    { k: ['tellippalai'], v: { name: 'Tellippalai', lat: 9.7833, lon: 80.0333 } },
    { k: ['nallur'], v: { name: 'Nallur', lat: 9.6667, lon: 80.0333 } },
    { k: ['kodikamam'], v: { name: 'Kodikamam', lat: 9.6000, lon: 80.1000 } },
    { k: ['velanai', 'velanaitheevu'], v: { name: 'Velanai', lat: 9.6500, lon: 79.9000 } },
    { k: ['karainagar'], v: { name: 'Karainagar', lat: 9.7333, lon: 79.8833 } },
    { k: ['kayts'], v: { name: 'Kayts', lat: 9.6833, lon: 79.8667 } },
    { k: ['punani'], v: { name: 'Punani', lat: 9.6333, lon: 80.0333 } },
    { k: ['thalaimannar', 'talaimannar'], v: { name: 'Thalaimannar', lat: 9.1000, lon: 79.7167 } },
    { k: ['madhu'], v: { name: 'Madhu', lat: 8.8500, lon: 80.2000 } },
    { k: ['nedunkeni'], v: { name: 'Nedunkeni', lat: 9.0833, lon: 80.3000 } },
    { k: ['oddisuddan'], v: { name: 'Oddusuddan', lat: 9.1167, lon: 80.3667 } },
    { k: ['puliyankulam'], v: { name: 'Puliyankulam', lat: 8.9167, lon: 80.4333 } },
    { k: ['mankulam'], v: { name: 'Mankulam', lat: 9.0833, lon: 80.4500 } },
    { k: ['omanthai', 'omantai'], v: { name: 'Omantai', lat: 8.9500, lon: 80.5000 } },
    { k: ['paraiyanakulam'], v: { name: 'Paraiyanakulam', lat: 8.7000, lon: 80.4833 } },
    { k: ['cevvaipattu', 'chevaipattu'], v: { name: 'Cevvaipattu', lat: 9.6833, lon: 80.1167 } },
    { k: ['pesalai'], v: { name: 'Pesalai', lat: 9.0500, lon: 79.8167 } },
    { k: ['adampan'], v: { name: 'Adampan', lat: 8.9167, lon: 79.9333 } },
    { k: ['nanattan', 'nanatan'], v: { name: 'Nanattan', lat: 8.9333, lon: 79.9833 } },

    // North Western Province
    { k: ['kurunegala'], v: { name: 'Kurunegala', lat: 7.4818, lon: 80.3623 } },
    { k: ['puttalam'], v: { name: 'Puttalam', lat: 8.0412, lon: 79.8484 } },
    { k: ['kuliyapitiya'], v: { name: 'Kuliyapitiya', lat: 7.4667, lon: 80.0500 } },
    { k: ['nikaweratiya'], v: { name: 'Nikaweratiya', lat: 7.7500, lon: 80.1167 } },
    { k: ['chilaw'], v: { name: 'Chilaw', lat: 7.5833, lon: 79.8000 } },
    { k: ['wennappuwa'], v: { name: 'Wennappuwa', lat: 7.3500, lon: 79.8333 } },
    { k: ['mawathagama'], v: { name: 'Mawathagama', lat: 7.4667, lon: 80.4833 } },
    { k: ['nawagattegama'], v: { name: 'Nawagattegama', lat: 7.9500, lon: 80.0500 } },
    { k: ['anamaduwa'], v: { name: 'Anamaduwa', lat: 7.8833, lon: 80.0000 } },
    { k: ['kalpitiya'], v: { name: 'Kalpitiya', lat: 8.2333, lon: 79.7833 } },
    { k: ['marawila'], v: { name: 'Marawila', lat: 7.4167, lon: 79.8333 } },
    { k: ['dankotuwa'], v: { name: 'Dankotuwa', lat: 7.2833, lon: 79.8833 } },
    { k: ['mundalama'], v: { name: 'Mundalama', lat: 8.1000, lon: 79.8333 } },
    { k: ['narammala'], v: { name: 'Narammala', lat: 7.4333, lon: 80.2167 } },
    { k: ['pannala'], v: { name: 'Pannala', lat: 7.3000, lon: 80.2167 } },
    { k: ['maho', 'maho junction'], v: { name: 'Maho', lat: 7.8167, lon: 80.2667 } },
    { k: ['galgamuwa'], v: { name: 'Galgamuwa', lat: 7.9833, lon: 80.2667 } },
    { k: ['wariyapola'], v: { name: 'Wariyapola', lat: 7.6333, lon: 80.2333 } },
    { k: ['bingiriya'], v: { name: 'Bingiriya', lat: 7.6000, lon: 80.0167 } },
    { k: ['katuneriya', 'katana'], v: { name: 'Katuneriya', lat: 7.3333, lon: 79.8333 } },
    { k: ['lumbe', 'lunuwila'], v: { name: 'Lunuwila', lat: 7.3500, lon: 79.8667 } },
    { k: ['nattandiya'], v: { name: 'Nattandiya', lat: 7.4000, lon: 79.8667 } },

    // North Central Province
    { k: ['anuradhapura'], v: { name: 'Anuradhapura', lat: 8.3114, lon: 80.4037 } },
    { k: ['polonnaruwa'], v: { name: 'Polonnaruwa', lat: 7.9403, lon: 81.0188 } },
    { k: ['medawachchiya'], v: { name: 'Medawachchiya', lat: 8.5333, lon: 80.4667 } },
    { k: ['tambuttegama'], v: { name: 'Tambuttegama', lat: 8.3000, lon: 80.4667 } },
    { k: ['mihintale'], v: { name: 'Mihintale', lat: 8.3500, lon: 80.5000 } },
    { k: ['horowpatana', 'horowpathana', 'horowpothana'], v: { name: 'Horowpathana', lat: 8.5167, lon: 80.8833 } },
    { k: ['kebithigollewa'], v: { name: 'Kebithigollewa', lat: 8.5167, lon: 80.6667 } },
    { k: ['kekirawa'], v: { name: 'Kekirawa', lat: 8.0333, lon: 80.6000 } },
    { k: ['padaviya'], v: { name: 'Padaviya', lat: 8.8167, lon: 80.7333 } },
    { k: ['galenbindunuwewa'], v: { name: 'Galenbindunuwewa', lat: 8.4333, lon: 80.8167 } },
    { k: ['rajanganaya', 'rajangana'], v: { name: 'Rajanganaya', lat: 8.1667, lon: 80.3333 } },
    { k: ['thirappane'], v: { name: 'Thirappane', lat: 8.2167, lon: 80.6833 } },
    { k: ['hathanagoda'], v: { name: 'Hathanagoda', lat: 8.0500, lon: 80.5333 } },

    // Uva Province
    { k: ['badulla'], v: { name: 'Badulla', lat: 6.9934, lon: 81.0550 } },
    { k: ['bandarawela'], v: { name: 'Bandarawela', lat: 6.8333, lon: 80.9833 } },
    { k: ['ella'], v: { name: 'Ella', lat: 6.8667, lon: 81.0500 } },
    { k: ['haputale'], v: { name: 'Haputale', lat: 6.7667, lon: 80.9667 } },
    { k: ['diyatalawa', 'diyathalawa'], v: { name: 'Diyatalawa', lat: 6.8167, lon: 80.9667 } },
    { k: ['wellawaya'], v: { name: 'Wellawaya', lat: 6.7333, lon: 81.1000 } },
    { k: ['monaragala', 'moneragala'], v: { name: 'Monaragala', lat: 6.8667, lon: 81.3500 } },
    { k: ['bibile'], v: { name: 'Bibile', lat: 7.1667, lon: 81.2167 } },
    { k: ['mahiyanganaya'], v: { name: 'Mahiyanganaya', lat: 7.3333, lon: 81.0000 } },
    { k: ['passara'], v: { name: 'Passara', lat: 6.9333, lon: 81.1500 } },
    { k: ['lunugala'], v: { name: 'Lunugala', lat: 6.9667, lon: 81.1667 } },
    { k: ['madderasinhala', 'madderasinha'], v: { name: 'Madderasinhala', lat: 6.9167, lon: 81.0500 } },
    { k: ['kandeketiaya'], v: { name: 'Kandeketiya', lat: 6.9833, lon: 81.0667 } },
    { k: ['telulla'], v: { name: 'Telulla', lat: 6.8667, lon: 81.1000 } },
    { k: ['buttala'], v: { name: 'Buttala', lat: 6.7500, lon: 81.2667 } },
    { k: ['tanamalwila', 'tanamalvila'], v: { name: 'Tanamalwila', lat: 6.4333, lon: 81.1333 } },
    { k: ['siyambalanduwa'], v: { name: 'Siyambalanduwa', lat: 6.9167, lon: 81.5333 } },

    // Sabaragamuwa Province
    { k: ['ratnapura'], v: { name: 'Ratnapura', lat: 6.7056, lon: 80.3848 } },
    { k: ['kegalle'], v: { name: 'Kegalle', lat: 7.2523, lon: 80.3460 } },
    { k: ['balangoda'], v: { name: 'Balangoda', lat: 6.6500, lon: 80.6833 } },
    { k: ['embilipitiya'], v: { name: 'Embilipitiya', lat: 6.3500, lon: 80.8500 } },
    { k: ['awissawella'], v: { name: 'Awissawella', lat: 6.9500, lon: 80.2167 } },
    { k: ['deraniyagala'], v: { name: 'Deraniyagala', lat: 6.9333, lon: 80.3333 } },
    { k: ['galigamuwa'], v: { name: 'Galigamuwa', lat: 7.2000, lon: 80.3333 } },
    { k: ['warakapola'], v: { name: 'Warakapola', lat: 7.2333, lon: 80.2000 } },
    { k: ['mawanella'], v: { name: 'Mawanella', lat: 7.2500, lon: 80.4333 } },
    { k: ['aranayake'], v: { name: 'Aranayake', lat: 7.1500, lon: 80.4500 } },
    { k: ['dehiowita'], v: { name: 'Dehiowita', lat: 6.9833, lon: 80.2667 } },
    { k: ['erathna'], v: { name: 'Erathna', lat: 6.7500, lon: 80.4333 } },
    { k: ['kiriella'], v: { name: 'Kiriella', lat: 6.7500, lon: 80.3500 } },
    { k: ['kolonna'], v: { name: 'Kolonna', lat: 6.4000, lon: 80.6833 } },
    { k: ['kuruwita'], v: { name: 'Kuruwita', lat: 6.7833, lon: 80.3667 } },
    { k: ['niwithigala'], v: { name: 'Niwithigala', lat: 6.5333, lon: 80.5000 } },
    { k: ['pelmadulla'], v: { name: 'Pelmadulla', lat: 6.6167, lon: 80.5000 } },
    { k: ['godakawela'], v: { name: 'Godakawela', lat: 6.5500, lon: 80.6500 } },
    { k: ['kahawatta', 'kahawatte'], v: { name: 'Kahawatta', lat: 6.6000, lon: 80.5667 } },
    { k: ['tholangamuwa'], v: { name: 'Tholangamuwa', lat: 7.0500, lon: 80.3000 } },
    { k: ['ruwanwella'], v: { name: 'Ruwanwella', lat: 7.0500, lon: 80.3000 } },
    { k: ['yatiyantota'], v: { name: 'Yatiyantota', lat: 7.0167, lon: 80.3000 } },

    // Additional notable places
    { k: ['kitulgala'], v: { name: 'Kitulgala', lat: 6.9920, lon: 80.4100 } },
    { k: ['adam peak', 'sri pada', 'sripada'], v: { name: 'Adam\'s Peak', lat: 6.8167, lon: 80.5000 } },
    { k: ['yala', 'yala national park'], v: { name: 'Yala', lat: 6.3724, lon: 81.5180 } },
    { k: ['wilpattu', 'wilpattu national park'], v: { name: 'Wilpattu', lat: 8.4333, lon: 80.0000 } },
    { k: ['sinharaja', 'sinharaja forest'], v: { name: 'Sinharaja', lat: 6.4167, lon: 80.4167 } },
    { k: ['horton plains'], v: { name: 'Horton Plains', lat: 6.8167, lon: 80.8000 } },
    { k: ['knuckles', 'knuckles range'], v: { name: 'Knuckles', lat: 7.3833, lon: 80.8500 } },
    { k: ['pinnawala', 'pinnawala elephant'], v: { name: 'Pinnawala', lat: 7.3000, lon: 80.3833 } },
  ];

  const SRI_LANKA_LOOKUP = {};
  SRI_LANKA_PLACES.forEach(p => p.k.forEach(key => { SRI_LANKA_LOOKUP[key.toLowerCase()] = p.v; }));

  const getSriLankaCity = (name) => SRI_LANKA_LOOKUP[name.toLowerCase().trim()] || null;

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
    getSriLankaCity
  };
})();
