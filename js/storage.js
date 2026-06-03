/**
 * SkyCast - Local Storage Module
 * Manages persistent data: recent searches, theme preference, unit preference
 */

const Storage = (() => {
  const KEYS = {
    RECENT_CITIES: 'skycast_recent_cities',
    FAVORITES: 'skycast_favorites',
    THEME: 'skycast_theme',
    UNIT: 'skycast_unit',
    LAST_CITY: 'skycast_last_city',
    OFFLINE_DATA: 'skycast_offline'
  };

  const MAX_RECENT = 10;
  const MAX_FAVORITES = 20;

  /**
   * Saves list of recent cities to localStorage
   * @param {Array} cities - Array of city objects [{name, temp, icon}]
   */
  const saveRecentCities = (cities) => {
    try {
      localStorage.setItem(KEYS.RECENT_CITIES, JSON.stringify(cities));
    } catch (e) {
      console.warn('Failed to save recent cities:', e);
    }
  };

  /**
   * Retrieves list of recent cities from localStorage
   * @returns {Array} Array of city objects
   */
  const getRecentCities = () => {
    try {
      const data = localStorage.getItem(KEYS.RECENT_CITIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to load recent cities:', e);
      return [];
    }
  };

  /**
   * Adds a city to the recent list, avoiding duplicates
   * @param {string} name - City name
   * @param {string} temp - Current temperature string
   * @param {string} icon - Weather icon code
   */
  const addRecentCity = (name, temp, icon) => {
    const cities = getRecentCities();
    const existing = cities.findIndex(
      c => c.name.toLowerCase() === name.toLowerCase()
    );

    if (existing !== -1) {
      cities.splice(existing, 1);
    }

    cities.unshift({ name, temp, icon });

    if (cities.length > MAX_RECENT) {
      cities.pop();
    }

    saveRecentCities(cities);
  };

  /**
   * Removes a city from the recent list
   * @param {string} name - City name to remove
   */
  const removeRecentCity = (name) => {
    const cities = getRecentCities().filter(
      c => c.name.toLowerCase() !== name.toLowerCase()
    );
    saveRecentCities(cities);
  };

  /**
   * Clears all recent cities
   */
  const clearRecentCities = () => {
    saveRecentCities([]);
  };

  /**
   * Saves theme preference
   * @param {string} theme - 'light' or 'dark'
   */
  const saveTheme = (theme) => {
    try {
      localStorage.setItem(KEYS.THEME, theme);
    } catch (e) {
      console.warn('Failed to save theme:', e);
    }
  };

  /**
   * Retrieves saved theme preference
   * @returns {string} 'light' or 'dark'
   */
  const getTheme = () => {
    try {
      return localStorage.getItem(KEYS.THEME) || 'light';
    } catch (e) {
      return 'light';
    }
  };

  /**
   * Saves temperature unit preference
   * @param {string} unit - 'metric' or 'imperial'
   */
  const saveUnit = (unit) => {
    try {
      localStorage.setItem(KEYS.UNIT, unit);
    } catch (e) {
      console.warn('Failed to save unit:', e);
    }
  };

  /**
   * Retrieves saved unit preference
   * @returns {string} 'metric' or 'imperial'
   */
  const getUnit = () => {
    try {
      return localStorage.getItem(KEYS.UNIT) || 'metric';
    } catch (e) {
      return 'metric';
    }
  };

  /**
   * Saves the last searched city
   * @param {string} city - City name
   */
  const saveLastCity = (city) => {
    try {
      localStorage.setItem(KEYS.LAST_CITY, city);
    } catch (e) {
      console.warn('Failed to save last city:', e);
    }
  };

  /**
   * Retrieves the last searched city
   * @returns {string} City name or empty string
   */
  const getLastCity = () => {
    try {
      return localStorage.getItem(KEYS.LAST_CITY) || '';
    } catch (e) {
      return '';
    }
  };

  // --- Favorites ---
  const getFavorites = () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.FAVORITES)) || [];
    } catch { return []; }
  };

  const saveFavorites = (list) => {
    try { localStorage.setItem(KEYS.FAVORITES, JSON.stringify(list)); } catch {}
  };

  const addFavorite = (name) => {
    const list = getFavorites();
    if (list.some(c => c.toLowerCase() === name.toLowerCase())) return;
    list.unshift(name);
    if (list.length > MAX_FAVORITES) list.pop();
    saveFavorites(list);
  };

  const removeFavorite = (name) => {
    saveFavorites(getFavorites().filter(c => c.toLowerCase() !== name.toLowerCase()));
  };

  const isFavorite = (name) => getFavorites().some(c => c.toLowerCase() === name.toLowerCase());

  // --- Offline Cache ---
  const saveOfflineData = (data) => {
    try { localStorage.setItem(KEYS.OFFLINE_DATA, JSON.stringify(data)); } catch {}
  };

  const getOfflineData = () => {
    try { return JSON.parse(localStorage.getItem(KEYS.OFFLINE_DATA)); } catch { return null; }
  };

  return {
    saveRecentCities,
    getRecentCities,
    addRecentCity,
    removeRecentCity,
    clearRecentCities,
    saveTheme,
    getTheme,
    saveUnit,
    getUnit,
    saveLastCity,
    getLastCity,
    getFavorites,
    saveFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    saveOfflineData,
    getOfflineData
  };
})();
