/**
 * SkyCast - API Integration Module
 * Handles all OpenWeatherMap API communication
 */

const API = (() => {
  const BASE_URL = 'https://api.openweathermap.org/data/2.5';
  const API_KEY = '9195373a6ada5940c3bc9c3c5ef00be9';

  /**
   * Fetches current weather data for a given city
   * @param {string} city - City name
   * @param {string} units - 'metric' or 'imperial'
   * @returns {Promise<Object>} Weather data object
   */
  const getCurrentWeather = async (city, units = 'metric') => {
    if (!city || !city.trim()) {
      throw new Error('Please enter a city name');
    }

    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city.trim())}&units=${units}&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`City "${city}" not found. Please check the spelling.`);
      }
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your configuration.');
      }
      throw new Error('Failed to fetch weather data. Please try again.');
    }

    return await response.json();
  };

  /**
   * Fetches current weather data using geographic coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} units - 'metric' or 'imperial'
   * @returns {Promise<Object>} Weather data object
   */
  const getCurrentWeatherByCoords = async (lat, lon, units = 'metric') => {
    const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your configuration.');
      }
      throw new Error('Failed to fetch weather data. Please try again.');
    }

    return await response.json();
  };

  /**
   * Fetches 5-day / 3-hour forecast data for a given city
   * @param {string} city - City name
   * @param {string} units - 'metric' or 'imperial'
   * @returns {Promise<Object>} Forecast data object
   */
  const getForecast = async (city, units = 'metric') => {
    if (!city || !city.trim()) {
      throw new Error('Please enter a city name');
    }

    const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city.trim())}&units=${units}&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`City "${city}" not found. Please check the spelling.`);
      }
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your configuration.');
      }
      throw new Error('Failed to fetch forecast data. Please try again.');
    }

    return await response.json();
  };

  /**
   * Fetches 5-day / 3-hour forecast data using geographic coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} units - 'metric' or 'imperial'
   * @returns {Promise<Object>} Forecast data object
   */
  const getForecastByCoords = async (lat, lon, units = 'metric') => {
    const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your configuration.');
      }
      throw new Error('Failed to fetch forecast data. Please try again.');
    }

    return await response.json();
  };

  return {
    getCurrentWeather,
    getCurrentWeatherByCoords,
    getForecast,
    getForecastByCoords
  };
})();
