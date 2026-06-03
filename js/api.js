/**
 * SkyCast - API Integration Module
 * Uses Open-Meteo (free, no API key required)
 */

const API = (() => {
  const BASE_URL = 'https://api.open-meteo.com/v1';
  const GEO_URL = 'https://geocoding-api.open-meteo.com/v1';

  /**
   * Converts WMO weather code to condition description and icon
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
      80: { desc: 'Slight rain showers', icon: '09d' },
      81: { desc: 'Moderate rain showers', icon: '09d' },
      82: { desc: 'Violent rain showers', icon: '09d' },
      85: { desc: 'Slight snow showers', icon: '13d' },
      86: { desc: 'Heavy snow showers', icon: '13d' },
      95: { desc: 'Thunderstorm', icon: '11d' },
      96: { desc: 'Thunderstorm with slight hail', icon: '11d' },
      99: { desc: 'Thunderstorm with heavy hail', icon: '11d' }
    };
    return map[code] || { desc: 'Unknown', icon: '01d' };
  };

  /**
   * Geocode a city name to coordinates
   */
  const geocodeCity = async (city) => {
    if (!city || !city.trim()) {
      throw new Error('Please enter a city name');
    }

    const url = `${GEO_URL}/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to find city. Please try again.');
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(`City "${city}" not found. Please check the spelling.`);
    }

    return data.results[0];
  };

  /**
   * Fetches current weather and forecast for coordinates
   */
  const fetchWeatherData = async (lat, lon, timezone = 'auto') => {
    const url = `${BASE_URL}/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,wind_speed_10m_max` +
      `&temperature_unit=celsius&wind_speed_unit=ms&timezone=${timezone}&forecast_days=6`;

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

    const current = data.current;
    const weather = getWeatherInfo(current.weathercode, true);

    return {
      name: geo.name,
      country: geo.country_code?.toUpperCase() || '',
      sys: { country: geo.country_code?.toUpperCase() || '' },
      main: {
        temp: current.temperature_2m,
        feels_like: current.apparent_temperature,
        humidity: current.relative_humidity_2m
      },
      wind: { speed: current.wind_speed_10m },
      weather: [{
        main: weather.desc,
        description: weather.desc,
        icon: weather.icon,
        id: current.weathercode
      }],
      coord: { lat: geo.latitude, lon: geo.longitude },
      timezone: geo.timezone || 'UTC'
    };
  };

  /**
   * Gets current weather by coordinates
   */
  const getCurrentWeatherByCoords = async (lat, lon, units = 'metric') => {
    const data = await fetchWeatherData(lat, lon);

    const current = data.current;
    const weather = getWeatherInfo(current.weathercode, true);

    return {
      name: 'Current Location',
      country: '',
      sys: { country: '' },
      main: {
        temp: current.temperature_2m,
        feels_like: current.apparent_temperature,
        humidity: current.relative_humidity_2m
      },
      wind: { speed: current.wind_speed_10m },
      weather: [{
        main: weather.desc,
        description: weather.desc,
        icon: weather.icon,
        id: current.weathercode
      }],
      coord: { lat, lon },
      timezone: 'UTC'
    };
  };

  /**
   * Gets 5-day forecast by city name
   */
  const getForecast = async (city, units = 'metric') => {
    const geo = await geocodeCity(city);
    const data = await fetchWeatherData(geo.latitude, geo.longitude, geo.timezone);

    return { list: data.daily, city: geo };
  };

  /**
   * Gets 5-day forecast by coordinates
   */
  const getForecastByCoords = async (lat, lon, units = 'metric') => {
    const data = await fetchWeatherData(lat, lon);

    return { list: data.daily, city: null };
  };

  return {
    getCurrentWeather,
    getCurrentWeatherByCoords,
    getForecast,
    getForecastByCoords,
    getWeatherInfo,
    fetchWeatherData
  };
})();
