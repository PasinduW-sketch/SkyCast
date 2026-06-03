/**
 * SkyCast - Main Application Module
 * Orchestrates all UI interactions, data fetching, and rendering
 */

const App = (() => {
  // --- DOM References ---
  const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarClose: document.getElementById('sidebarClose'),
    hamburger: document.getElementById('hamburger'),
    overlay: document.getElementById('overlay'),
    recentList: document.getElementById('recentList'),
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    themeToggle: document.getElementById('themeToggle'),
    unitToggle: document.getElementById('unitToggle'),
    datetime: document.getElementById('datetime'),
    loadingContainer: document.getElementById('loadingContainer'),
    errorContainer: document.getElementById('errorContainer'),
    errorMessage: document.getElementById('errorMessage'),
    errorRetry: document.getElementById('errorRetry'),
    weatherDashboard: document.getElementById('weatherDashboard'),
    cityName: document.getElementById('cityName'),
    currentDate: document.getElementById('currentDate'),
    currentTemp: document.getElementById('currentTemp'),
    tempUnitDisplay: document.querySelectorAll('.temp-unit'),
    weatherCondition: document.getElementById('weatherCondition'),
    weatherIcon: document.getElementById('weatherIcon'),
    weatherBg: document.getElementById('weatherBg'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    forecastCards: document.getElementById('forecastCards')
  };

  // --- State ---
  let state = {
    currentCity: Storage.getLastCity(),
    unit: Storage.getUnit(),
    weatherData: null,
    forecastData: null,
    autoRefreshInterval: null,
    isFetching: false
  };

  // --- Initialization ---
  const init = () => {
    loadTheme();
    loadUnit();
    setupEventListeners();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    renderRecentCities();

    if (state.currentCity) {
      fetchWeatherByCity(state.currentCity);
    } else {
      detectLocation();
    }
  };

  // --- Theme ---
  const loadTheme = () => {
    const theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    Storage.saveTheme(next);
  };

  // --- Unit ---
  const loadUnit = () => {
    state.unit = Storage.getUnit();
    elements.unitToggle.textContent = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';
    elements.tempUnitDisplay.forEach(el => {
      el.textContent = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';
    });
  };

  const toggleUnit = () => {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    Storage.saveUnit(state.unit);
    elements.unitToggle.textContent = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';
    elements.tempUnitDisplay.forEach(el => {
      el.textContent = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';
    });
    if (state.currentCity) {
      fetchWeatherByCity(state.currentCity);
    }
  };

  // --- DateTime ---
  const updateDateTime = () => {
    const now = new Date();
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    elements.datetime.textContent = now.toLocaleDateString('en-US', options);
  };

  // --- Event Listeners ---
  const setupEventListeners = () => {
    elements.searchForm.addEventListener('submit', handleSearch);
    elements.hamburger.addEventListener('click', openSidebar);
    elements.sidebarClose.addEventListener('click', closeSidebar);
    elements.overlay.addEventListener('click', closeSidebar);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.errorRetry.addEventListener('click', () => {
      if (state.currentCity) {
        fetchWeatherByCity(state.currentCity);
      } else {
        detectLocation();
      }
    });
  };

  // --- Sidebar ---
  const openSidebar = () => {
    elements.sidebar.classList.add('active');
    elements.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeSidebar = () => {
    elements.sidebar.classList.remove('active');
    elements.overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  // --- Search ---
  const handleSearch = (e) => {
    e.preventDefault();
    const city = elements.searchInput.value.trim();
    if (!city) {
      showError('Please enter a city name.');
      return;
    }
    state.currentCity = city;
    Storage.saveLastCity(city);
    fetchWeatherByCity(city);
    elements.searchInput.blur();
  };

  // --- Geolocation ---
  const detectLocation = () => {
    if (!navigator.geolocation) {
      if (state.currentCity) {
        fetchWeatherByCity(state.currentCity);
      }
      return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const weatherData = await API.getCurrentWeatherByCoords(latitude, longitude, state.unit);
          const forecastData = await API.getForecastByCoords(latitude, longitude, state.unit);
          state.currentCity = weatherData.name;
          Storage.saveLastCity(weatherData.name);
          renderWeather(weatherData, forecastData);
        } catch (err) {
          showError(err.message);
        }
      },
      () => {
        if (state.currentCity) {
          fetchWeatherByCity(state.currentCity);
        } else {
          fetchWeatherByCity('London');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  // --- Fetch Weather ---
  const fetchWeatherByCity = async (city) => {
    if (state.isFetching) return;
    state.isFetching = true;

    showLoading();
    hideError();

    try {
      const [weatherData, forecastData] = await Promise.all([
        API.getCurrentWeather(city, state.unit),
        API.getForecast(city, state.unit)
      ]);

      state.currentCity = weatherData.name;
      Storage.saveLastCity(weatherData.name);
      Storage.addRecentCity(
        weatherData.name,
        Math.round(weatherData.main.temp),
        weatherData.weather[0].icon
      );

      renderWeather(weatherData, forecastData);
      renderRecentCities();
      startAutoRefresh();
    } catch (err) {
      showError(err.message);
    } finally {
      state.isFetching = false;
    }
  };

  // --- Render Weather ---
  const renderWeather = (weatherData, forecastData) => {
    state.weatherData = weatherData;
    state.forecastData = forecastData;

    hideLoading();
    hideError();
    elements.weatherDashboard.style.display = 'flex';

    const main = weatherData.main;
    const weather = weatherData.weather[0];
    const wind = weatherData.wind;
    const unitSymbol = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';
    const speedUnit = state.unit === 'metric' ? 'm/s' : 'mph';

    elements.cityName.textContent = `${weatherData.name}, ${weatherData.sys.country}`;
    elements.currentDate.textContent = formatDate(new Date());
    elements.currentTemp.textContent = Math.round(main.temp);
    elements.weatherCondition.textContent = weather.description;
    elements.feelsLike.textContent = `${Math.round(main.feels_like)}${unitSymbol}`;
    elements.humidity.textContent = `${main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(wind.speed)} ${speedUnit}`;
    elements.weatherIcon.src = `https://openweathermap.org/img/wn/${weather.icon}@4x.png`;
    elements.weatherIcon.alt = weather.description;

    setWeatherBackground(weather.icon, weather.main);
    renderForecast(forecastData);
    updateDateTime();
  };

  // --- Render Forecast ---
  const renderForecast = (forecastData) => {
    const dailyData = processForecast(forecastData.list);
    elements.forecastCards.innerHTML = '';

    dailyData.forEach(day => {
      const card = document.createElement('div');
      card.className = 'forecast-card glass';

      const unitSymbol = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';

      card.innerHTML = `
        <div class="forecast-day">${day.day}</div>
        <img class="forecast-icon" src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.condition}" />
        <div class="forecast-temp">${Math.round(day.temp)}${unitSymbol}</div>
        <div class="forecast-temp-range">H:${Math.round(day.tempMax)}${unitSymbol} L:${Math.round(day.tempMin)}${unitSymbol}</div>
        <div class="forecast-condition">${day.condition}</div>
      `;

      elements.forecastCards.appendChild(card);
    });
  };

  /**
   * Processes 3-hour forecast list into daily forecasts
   * @param {Array} list - 3-hour forecast entries
   * @returns {Array} Daily forecast summaries
   */
  const processForecast = (list) => {
    const dailyMap = {};

    list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateKey = date.toLocaleDateString('en-US');

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          day: dayKey,
          temps: [],
          tempMax: -Infinity,
          tempMin: Infinity,
          icon: item.weather[0].icon,
          condition: item.weather[0].description,
          iconPriority: getIconPriority(item.weather[0].icon)
        };
      }

      const entry = dailyMap[dateKey];
      entry.temps.push(item.main.temp);
      entry.tempMax = Math.max(entry.tempMax, item.main.temp_max);
      entry.tempMin = Math.min(entry.tempMin, item.main.temp_min);

      const currentPriority = getIconPriority(item.weather[0].icon);
      if (currentPriority > entry.iconPriority) {
        entry.icon = item.weather[0].icon;
        entry.condition = item.weather[0].description;
        entry.iconPriority = currentPriority;
      }
    });

    const today = new Date().toLocaleDateString('en-US');
    return Object.entries(dailyMap)
      .filter(([key]) => key !== today)
      .slice(0, 5)
      .map(([, value]) => ({
        day: value.day,
        temp: value.temps.reduce((a, b) => a + b, 0) / value.temps.length,
        tempMax: value.tempMax,
        tempMin: value.tempMin,
        icon: value.icon,
        condition: value.condition
      }));
  };

  /**
   * Priority system for weather icons (higher = more severe)
   */
  const getIconPriority = (icon) => {
    const severe = ['11d', '11n'];
    const rainy = ['09d', '09n', '10d', '10n'];
    const snowy = ['13d', '13n'];
    const cloudy = ['04d', '04n', '03d', '03n'];
    const clear = ['01d', '01n'];

    if (severe.includes(icon)) return 5;
    if (rainy.includes(icon)) return 4;
    if (snowy.includes(icon)) return 3;
    if (cloudy.includes(icon)) return 2;
    if (clear.includes(icon)) return 1;
    return 0;
  };

  // --- Weather Background ---
  const setWeatherBackground = (icon, mainCondition) => {
    const isNight = icon.endsWith('n');
    const condition = mainCondition.toLowerCase();

    let bgClass = 'weather-bg-clear';

    if (isNight) {
      bgClass = 'weather-bg-night';
    } else if (condition.includes('thunderstorm')) {
      bgClass = 'weather-bg-thunderstorm';
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
      bgClass = condition.includes('drizzle') ? 'weather-bg-drizzle' : 'weather-bg-rain';
    } else if (condition.includes('snow')) {
      bgClass = 'weather-bg-snow';
    } else if (condition.includes('clouds') || condition.includes('overcast')) {
      bgClass = 'weather-bg-clouds';
    } else if (condition.includes('mist') || condition.includes('fog') || condition.includes('haze')) {
      bgClass = 'weather-bg-mist';
    }

    elements.weatherBg.className = `current-weather-bg ${bgClass}`;
  };

  // --- Recent Cities ---
  const renderRecentCities = () => {
    const cities = Storage.getRecentCities();
    elements.recentList.innerHTML = '';

    if (cities.length === 0) {
      elements.recentList.innerHTML = '<li class="recent-item" style="cursor:default;justify-content:center;opacity:0.6">No recent searches</li>';
      return;
    }

    cities.forEach(city => {
      const li = document.createElement('li');
      li.className = 'recent-item';

      const iconUrl = city.icon
        ? `https://openweathermap.org/img/wn/${city.icon}.png`
        : '';

      li.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          ${iconUrl ? `<img src="${iconUrl}" alt="" style="width:28px;height:28px;" />` : ''}
          <span class="recent-item-city">${city.name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="recent-item-temp">${city.temp || ''}\u00B0</span>
          <button class="recent-item-remove" data-city="${city.name}" aria-label="Remove">&times;</button>
        </div>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('recent-item-remove')) return;
        state.currentCity = city.name;
        Storage.saveLastCity(city.name);
        fetchWeatherByCity(city.name);
        closeSidebar();
      });

      const removeBtn = li.querySelector('.recent-item-remove');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Storage.removeRecentCity(city.name);
        renderRecentCities();
      });

      elements.recentList.appendChild(li);
    });
  };

  // --- Auto Refresh ---
  const startAutoRefresh = () => {
    if (state.autoRefreshInterval) {
      clearInterval(state.autoRefreshInterval);
    }
    state.autoRefreshInterval = setInterval(() => {
      if (state.currentCity && !state.isFetching) {
        fetchWeatherByCity(state.currentCity);
      }
    }, 300000);
  };

  // --- UI Helpers ---
  const showLoading = () => {
    elements.loadingContainer.style.display = 'flex';
    elements.weatherDashboard.style.display = 'none';
    elements.errorContainer.classList.remove('active');
  };

  const hideLoading = () => {
    elements.loadingContainer.style.display = 'none';
  };

  const showError = (message) => {
    hideLoading();
    elements.weatherDashboard.style.display = 'none';
    elements.errorContainer.classList.add('active');
    elements.errorMessage.textContent = message;
    elements.searchInput.value = state.currentCity || '';
  };

  const hideError = () => {
    elements.errorContainer.classList.remove('active');
  };

  const formatDate = (date) => {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  // --- Bootstrap ---
  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
