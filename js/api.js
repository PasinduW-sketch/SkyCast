/**
 * SkyCast - API Integration Module (Open-Meteo)
 * Free, no API key required, lifetime non-commercial use.
 * Docs: https://open-meteo.com/en/docs
 */

const API = (() => {
  const BASE_URL = 'https://api.open-meteo.com/v1';
  const GEO_URL = 'https://geocoding-api.open-meteo.com/v1';

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
   * Geocode a city name to coordinates
   */
  const geocodeCity = async (city) => {
    if (!city || !city.trim()) {
      throw new Error('Please enter a city name to search');
    }

    const url = `${GEO_URL}/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Could not reach the weather service. Please try again.');
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(`Hmm, we couldn't find "${city}". Double-check the spelling?`);
    }

    return data.results[0];
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
   * Gets current weather by coordinates
   */
  const getCurrentWeatherByCoords = async (lat, lon, units = 'metric') => {
    const data = await fetchWeatherData(lat, lon);
    const c = data.current;
    const weather = getWeatherInfo(c.weathercode, true);

    return {
      name: 'Current Location',
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
    const url = `${GEO_URL}/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return (data.results || []).map(r => ({
        name: r.name,
        country: r.country,
        admin: r.admin1 || ''
      }));
    } catch {
      return [];
    }
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
    getFunnyError
  };
})();
