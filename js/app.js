/**
 * SkyCast - Main Application Module
 * Handles all UI rendering, event handling, and state management
 */

const App = (() => {
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
    friendlyCondition: document.getElementById('friendlyCondition'),
    currentTemp: document.getElementById('currentTemp'),
    tempUnitDisplay: document.querySelectorAll('.temp-unit'),
    weatherCondition: document.getElementById('weatherCondition'),
    weatherIcon: document.getElementById('weatherIcon'),
    weatherBg: document.getElementById('weatherBg'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    cloudCover: document.getElementById('cloudCover'),
    forecastCards: document.getElementById('forecastCards'),
    hourlyCards: document.getElementById('hourlyCards'),
    uvIndex: document.getElementById('uvIndex'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    rainChance: document.getElementById('rainChance'),
    pressure: document.getElementById('pressure'),
    windDirection: document.getElementById('windDirection'),
    toastContainer: document.getElementById('toastContainer')
  };

  let state = {
    currentCity: Storage.getLastCity(),
    unit: Storage.getUnit(),
    weatherData: null,
    forecastData: null,
    autoRefreshInterval: null,
    isFetching: false
  };

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

  const loadTheme = () => {
    const theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    Storage.saveTheme(next);
    showToast(next === 'dark' ? 'Dark mode activated' : 'Light mode activated', 'success');
  };

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

  const handleSearch = (e) => {
    e.preventDefault();
    const city = elements.searchInput.value.trim();
    if (!city) {
      showError('Please enter a city name to search');
      return;
    }
    state.currentCity = city;
    Storage.saveLastCity(city);
    fetchWeatherByCity(city);
    elements.searchInput.blur();
  };

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
      showToast(err.message, 'error');
    } finally {
      state.isFetching = false;
    }
  };

  const renderWeather = (weatherData, forecastData) => {
    state.weatherData = weatherData;
    state.forecastData = forecastData;

    hideLoading();
    hideError();
    elements.weatherDashboard.style.display = 'flex';
    elements.weatherDashboard.classList.add('animate');
    setTimeout(() => elements.weatherDashboard.classList.remove('animate'), 600);

    const main = weatherData.main;
    const weather = weatherData.weather[0];
    const wind = weatherData.wind;
    const unitSymbol = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';
    const speedUnit = state.unit === 'metric' ? 'm/s' : 'mph';

    const country = weatherData.country || weatherData.sys?.country || '';
    elements.cityName.textContent = country
      ? `${weatherData.name}, ${country}`
      : weatherData.name;
    elements.currentDate.textContent = formatDate(new Date());
    elements.currentTemp.textContent = Math.round(main.temp);
    elements.weatherCondition.textContent = weather.description;
    elements.friendlyCondition.textContent = weatherData.friendly || '';

    elements.feelsLike.textContent = `${Math.round(main.feels_like)}${unitSymbol}`;
    elements.humidity.textContent = `${main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(wind.speed)} ${speedUnit}`;
    elements.cloudCover.textContent = weatherData.clouds?.all !== undefined
      ? `${weatherData.clouds.all}%` : '--';

    elements.weatherIcon.src = `https://openweathermap.org/img/wn/${weather.icon}@4x.png`;
    elements.weatherIcon.alt = weather.description;

    setWeatherBackground(weather.icon, weather.main);
    renderForecast(forecastData);
    renderHourly(forecastData);
    renderHighlights(weatherData, forecastData);
    updateDateTime();
  };

  const renderForecast = (forecastData) => {
    const dailyData = processForecast(forecastData.daily);
    elements.forecastCards.innerHTML = '';

    dailyData.forEach(day => {
      const card = document.createElement('div');
      card.className = 'forecast-card glass';
      const unitSymbol = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';

      card.innerHTML = `
        <div class="forecast-day">${day.day}</div>
        <img class="forecast-icon" src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.condition}" loading="lazy" />
        <div class="forecast-temp">${Math.round(day.temp)}${unitSymbol}</div>
        <div class="forecast-temp-range">H:${Math.round(day.tempMax)}${unitSymbol} L:${Math.round(day.tempMin)}${unitSymbol}</div>
        <div class="forecast-condition">${day.condition}</div>
      `;

      elements.forecastCards.appendChild(card);
    });
  };

  const processForecast = (daily) => {
    if (!daily || !daily.time) return [];
    const today = new Date().toLocaleDateString('en-US');

    return daily.time
      .map((dateStr, i) => {
        const date = new Date(dateStr + 'T12:00:00');
        const dateKey = date.toLocaleDateString('en-US');
        const weather = API.getWeatherInfo(daily.weathercode[i]);
        return {
          day: date.toLocaleDateString('en-US', { weekday: 'long' }),
          temp: (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2,
          tempMax: daily.temperature_2m_max[i],
          tempMin: daily.temperature_2m_min[i],
          icon: weather.icon,
          condition: weather.desc,
          dateKey
        };
      })
      .filter(d => d.dateKey !== today)
      .slice(0, 5);
  };

  const renderHourly = (forecastData) => {
    const hourly = forecastData.hourly;
    if (!hourly || !hourly.time) return;

    elements.hourlyCards.innerHTML = '';
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toLocaleDateString('en-US');

    let count = 0;

    hourly.time.forEach((timeStr, i) => {
      const date = new Date(timeStr);
      const hour = date.getHours();
      const dateKey = date.toLocaleDateString('en-US');
      const hoursFromNow = Math.round((date - now) / (1000 * 60 * 60));

      if (hoursFromNow < 0 && dateKey === todayStr) return;

      if (count >= 12) return;

      const weather = API.getWeatherInfo(hourly.weathercode[i]);
      const isActive = hoursFromNow === 0 || (hoursFromNow < 1 && hoursFromNow >= 0);

      const card = document.createElement('div');
      card.className = `hourly-card${isActive ? ' active' : ''}`;

      let timeLabel;
      if (hoursFromNow <= 0 && dateKey === todayStr) {
        timeLabel = 'Now';
      } else if (dateKey !== todayStr) {
        timeLabel = date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric' });
      } else {
        timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      }

      const rain = hourly.precipitation_probability?.[i];

      card.innerHTML = `
        <div class="hourly-time">${timeLabel}</div>
        <img class="hourly-icon" src="https://openweathermap.org/img/wn/${weather.icon}.png" alt="${weather.desc}" loading="lazy" />
        <div class="hourly-temp">${Math.round(hourly.temperature_2m[i])}\u00B0</div>
        ${rain !== undefined ? `<div class="hourly-rain">${rain}%</div>` : ''}
      `;

      elements.hourlyCards.appendChild(card);
      count++;
    });
  };

  const renderHighlights = (weatherData, forecastData) => {
    const daily = forecastData.daily;
    const main = weatherData.main;
    const wind = weatherData.wind;

    if (daily && daily.uv_index_max) {
      const uv = Math.round(daily.uv_index_max[0] * 10) / 10;
      elements.uvIndex.textContent = uv;
      elements.uvIndex.title = uv >= 8 ? 'Very high' : uv >= 6 ? 'High' : uv >= 3 ? 'Moderate' : 'Low';
    }

    if (daily && daily.sunrise) {
      const time = new Date(daily.sunrise[0]);
      elements.sunrise.textContent = time.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      });
    }

    if (daily && daily.sunset) {
      const time = new Date(daily.sunset[0]);
      elements.sunset.textContent = time.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      });
    }

    if (daily && daily.precipitation_probability_max) {
      elements.rainChance.textContent = `${daily.precipitation_probability_max[0]}%`;
    }

    if (main && main.pressure) {
      elements.pressure.textContent = `${Math.round(main.pressure)} hPa`;
    }

    if (wind && wind.deg !== undefined) {
      elements.windDirection.textContent = getWindDirection(wind.deg);
    }
  };

  const getWindDirection = (deg) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

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
    } else if (condition.includes('cloud') || condition.includes('overcast')) {
      bgClass = 'weather-bg-clouds';
    } else if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) {
      bgClass = 'weather-bg-mist';
    }

    elements.weatherBg.className = `current-weather-bg ${bgClass}`;
  };

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
          ${iconUrl ? `<img src="${iconUrl}" alt="" style="width:28px;height:28px;" loading="lazy" />` : ''}
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

  const startAutoRefresh = () => {
    if (state.autoRefreshInterval) {
      clearInterval(state.autoRefreshInterval);
    }
    state.autoRefreshInterval = setInterval(() => {
      if (state.currentCity && !state.isFetching) {
        fetchWeatherByCity(state.currentCity);
        showToast('Weather data refreshed', 'success');
      }
    }, 300000);
  };

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

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' toast-error' : ''}${type === 'success' ? ' toast-success' : ''}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
