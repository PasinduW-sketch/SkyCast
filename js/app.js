/**
 * SkyCast - Main Application Module
 */

const App = (() => {
  const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarClose: document.getElementById('sidebarClose'),
    hamburger: document.getElementById('hamburger'),
    overlay: document.getElementById('overlay'),
    recentList: document.getElementById('recentList'),
    favList: document.getElementById('favList'),
    sidebarTabs: document.querySelectorAll('.sidebar-tab'),
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    suggestions: document.getElementById('suggestions'),
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
    liveTime: document.getElementById('liveTime'),
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
    favBtn: document.getElementById('favBtn'),
    forecastCards: document.getElementById('forecastCards'),
    hourlyCards: document.getElementById('hourlyCards'),
    uvIndex: document.getElementById('uvIndex'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    rainChance: document.getElementById('rainChance'),
    windDirection: document.getElementById('windDirection'),
    visibility: document.getElementById('visibility'),
    dashTemp: document.getElementById('dashTemp'),
    dashWind: document.getElementById('dashWind'),
    dashHumidity: document.getElementById('dashHumidity'),
    dashUv: document.getElementById('dashUv'),
    dashPressure: document.getElementById('dashPressure'),
    mapImage: document.getElementById('mapImage'),
    locationBanner: document.getElementById('locationBanner'),
    locationText: document.getElementById('locationText'),
    locationChange: document.getElementById('locationChange'),
    toastContainer: document.getElementById('toastContainer'),
    navItems: document.querySelectorAll('.nav-item'),
    navSearch: document.getElementById('navSearch'),
    navFavs: document.getElementById('navFavs')
  };

  let state = {
    currentCity: Storage.getLastCity(),
    unit: Storage.getUnit(),
    weatherData: null,
    forecastData: null,
    autoRefreshInterval: null,
    isFetching: false,
    isGeolocation: false,
    coords: null,
    timezone: 'auto',
    suggestionsTimer: null
  };

  const fetchByCoords = async (lat, lon) => {
    const [w, f] = await Promise.all([
      API.getCurrentWeatherByCoords(lat, lon, state.unit),
      API.getForecastByCoords(lat, lon, state.unit)
    ]);
    if (!w.name || w.name === 'Current Location') w.name = 'My Location';
    return { weatherData: w, forecastData: f };
  };

  const init = () => {
    loadTheme();
    loadUnit();
    setupEventListeners();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    renderSidebar();

    if (state.currentCity && state.currentCity !== 'Current Location') {
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
    showToast(next === 'dark' ? 'Dark mode \uD83C\uDF19' : 'Light mode \u2600\uFE0F', 'success');
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
    elements.datetime.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const setupEventListeners = () => {
    elements.searchForm.addEventListener('submit', handleSearch);
    elements.searchInput.addEventListener('input', handleSuggestions);
    elements.searchInput.addEventListener('blur', () => setTimeout(() => hideSuggestions(), 200));
    elements.searchInput.addEventListener('focus', () => { if (elements.suggestions.children.length) showSuggestions(); });
    elements.hamburger.addEventListener('click', openSidebar);
    elements.sidebarClose.addEventListener('click', closeSidebar);
    elements.overlay.addEventListener('click', closeSidebar);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.favBtn.addEventListener('click', toggleFavorite);
    elements.locationChange.addEventListener('click', () => { state.isGeolocation = false; hideLocationBanner(); });
    elements.errorRetry.addEventListener('click', () => {
      state.currentCity ? fetchWeatherByCity(state.currentCity) : detectLocation();
    });

    elements.sidebarTabs.forEach(tab => {
      tab.addEventListener('click', () => switchSidebarTab(tab.dataset.tab));
    });

    elements.navItems.forEach(item => {
      item.addEventListener('click', () => handleNav(item.dataset.view));
    });

    elements.navSearch.addEventListener('click', () => {
      elements.searchInput.focus();
    });
  };

  const handleNav = (view) => {
    elements.navItems.forEach(n => n.classList.remove('active'));
    elements.navItems.forEach(n => { if (n.dataset.view === view) n.classList.add('active'); });
    if (view === 'search') {
      elements.searchInput.focus();
    } else if (view === 'favorites') {
      openSidebar();
      switchSidebarTab('favorites');
    }
  };

  const switchSidebarTab = (tab) => {
    elements.sidebarTabs.forEach(t => t.classList.remove('active'));
    elements.sidebarTabs.forEach(t => { if (t.dataset.tab === tab) t.classList.add('active'); });
    elements.recentList.classList.toggle('active', tab === 'recent');
    elements.favList.classList.toggle('active', tab === 'favorites');
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
      showError(API.getFunnyError('empty'));
      return;
    }
    hideSuggestions();
    state.currentCity = city;
    state.isGeolocation = false;
    state.coords = null;
    hideLocationBanner();
    Storage.saveLastCity(city);
    fetchWeatherByCity(city);
    elements.searchInput.blur();
  };

  const handleSuggestions = () => {
    clearTimeout(state.suggestionsTimer);
    const q = elements.searchInput.value.trim();
    if (q.length < 2) { hideSuggestions(); return; }
    state.suggestionsTimer = setTimeout(async () => {
      const results = await API.searchCities(q);
      renderSuggestions(results);
    }, 300);
  };

  const renderSuggestions = (results) => {
    elements.suggestions.innerHTML = '';
    if (!results.length) { hideSuggestions(); return; }
    results.forEach(r => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.innerHTML = `${r.name}${r.admin ? ', ' + r.admin : ''}<div class="suggestion-meta">${r.country}</div>`;
      div.addEventListener('click', () => {
        elements.searchInput.value = r.name;
        hideSuggestions();
        handleSearch(new Event('submit'));
      });
      elements.suggestions.appendChild(div);
    });
    showSuggestions();
  };

  const showSuggestions = () => elements.suggestions.classList.add('active');
  const hideSuggestions = () => elements.suggestions.classList.remove('active');

  const detectLocation = () => {
    if (!navigator.geolocation) {
      if (state.currentCity) fetchWeatherByCity(state.currentCity);
      return;
    }
    showLoading();
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          state.coords = { lat: latitude, lon: longitude };
          state.isGeolocation = true;
          const { weatherData, forecastData } = await fetchByCoords(latitude, longitude);
          state.currentCity = (weatherData.name && weatherData.name !== 'Current Location') ? weatherData.name : 'My Location';
          Storage.saveLastCity(state.currentCity);
          renderWeather(weatherData, forecastData);
          showLocationBanner(state.currentCity);
        } catch (err) {
          showError(err.message);
        }
      },
      () => {
        if (state.currentCity) fetchWeatherByCity(state.currentCity);
        else fetchWeatherByCity('London');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const showLocationBanner = (city) => {
    elements.locationText.textContent = `Using your location: ${city}`;
    elements.locationBanner.style.display = 'flex';
  };

  const hideLocationBanner = () => {
    elements.locationBanner.style.display = 'none';
  };

  const fetchWeatherByCity = async (city) => {
    if (state.isFetching) return;
    if (!city || city === 'Current Location') {
      if (!state.isGeolocation) detectLocation();
      return;
    }
    state.isFetching = true;
    showLoading();
    hideError();

    try {
      const [weatherData, forecastData] = await Promise.all([
        API.getCurrentWeather(city, state.unit),
        API.getForecast(city, state.unit)
      ]);

      state.currentCity = weatherData.name;
      state.timezone = weatherData.timezone || 'auto';
      Storage.saveLastCity(weatherData.name);
      Storage.addRecentCity(weatherData.name, Math.round(weatherData.main.temp), weatherData.weather[0].icon);
      Storage.saveOfflineData({ weather: weatherData, forecast: forecastData });

      renderWeather(weatherData, forecastData);
      renderSidebar();
      startAutoRefresh();
    } catch (err) {
      const offline = Storage.getOfflineData();
      if (offline && state.currentCity) {
        showToast('Offline: showing last saved data', 'error');
        renderWeather(offline.weather, offline.forecast);
      } else {
        showError(err.message);
        showToast(err.message, 'error');
      }
    } finally {
      state.isFetching = false;
    }
  };

  const renderWeather = (weatherData, forecastData) => {
    state.weatherData = weatherData;
    state.forecastData = forecastData;
    state.timezone = weatherData.timezone || 'auto';

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

    const country = weatherData.sys?.country || weatherData.country || '';
    elements.cityName.textContent = country ? `${weatherData.name}, ${country}` : weatherData.name;
    elements.currentDate.textContent = formatDate(new Date());
    elements.currentTemp.textContent = Math.round(main.temp);
    elements.weatherCondition.textContent = weather.description;
    elements.friendlyCondition.textContent = weatherData.friendly || '';

    elements.feelsLike.textContent = `${Math.round(main.feels_like)}${unitSymbol}`;
    elements.humidity.textContent = `${main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(wind.speed)} ${speedUnit}`;
    elements.cloudCover.textContent = weatherData.clouds?.all !== undefined ? `${weatherData.clouds.all}%` : '--';

    elements.weatherIcon.src = `https://openweathermap.org/img/wn/${weather.icon}@4x.png`;
    elements.weatherIcon.alt = weather.description;

    // Favorite button
    updateFavBtn();

    // Dashboard mini cards
    elements.dashTemp.textContent = `${Math.round(main.temp)}${unitSymbol}`;
    elements.dashWind.textContent = `${Math.round(wind.speed)} ${speedUnit}`;
    elements.dashHumidity.textContent = `${main.humidity}%`;
    if (forecastData.daily && forecastData.daily.uv_index_max) {
      elements.dashUv.textContent = Math.round(forecastData.daily.uv_index_max[0] * 10) / 10;
    }

    // Map
    if (weatherData.coord) {
      const { lat, lon } = weatherData.coord;
      elements.mapImage.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=10&size=600x250&markers=${lat},${lon}`;
      elements.mapImage.alt = `Map of ${weatherData.name}`;
    }

    setWeatherBackground(weather.icon, weather.main);
    renderForecast(forecastData);
    renderHourly(forecastData);
    renderHighlights(weatherData, forecastData);
    startLiveTime();
    updateDateTime();
  };

  const renderForecast = (forecastData) => {
    const daily = forecastData.daily;
    elements.forecastCards.innerHTML = '';
    if (!daily || !daily.time) return;
    const today = new Date().toLocaleDateString('en-US');

    daily.time.forEach((dateStr, i) => {
      const date = new Date(dateStr + 'T12:00:00');
      if (date.toLocaleDateString('en-US') === today) return;
      if (i > 5) return;
      const weather = API.getWeatherInfo(daily.weathercode[i]);
      const card = document.createElement('div');
      card.className = 'forecast-card glass';
      const unitSymbol = state.unit === 'metric' ? '\u00B0C' : '\u00B0F';
      card.innerHTML = `
        <div class="forecast-day">${date.toLocaleDateString('en-US', { weekday: 'long' })}</div>
        <img class="forecast-icon" src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.desc}" loading="lazy" />
        <div class="forecast-temp">${Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2)}${unitSymbol}</div>
        <div class="forecast-temp-range">H:${Math.round(daily.temperature_2m_max[i])}${unitSymbol} L:${Math.round(daily.temperature_2m_min[i])}${unitSymbol}</div>
        <div class="forecast-condition">${weather.desc}</div>
      `;
      elements.forecastCards.appendChild(card);
    });
  };

  const renderHourly = (forecastData) => {
    const hourly = forecastData.hourly;
    elements.hourlyCards.innerHTML = '';
    if (!hourly || !hourly.time) return;

    const now = new Date();
    let count = 0;

    hourly.time.forEach((timeStr, i) => {
      if (count >= 12) return;
      const date = new Date(timeStr);
      const hoursFromNow = Math.round((date - now) / (1000 * 60 * 60));
      if (hoursFromNow < -1) return;

      const weather = API.getWeatherInfo(hourly.weathercode[i]);
      const isActive = hoursFromNow <= 0;

      const card = document.createElement('div');
      card.className = `hourly-card${isActive ? ' active' : ''}`;
      let timeLabel = hoursFromNow <= 0 ? 'Now' : date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
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
      elements.dashUv.textContent = uv;
    }
    if (daily && daily.sunrise) elements.sunrise.textContent = new Date(daily.sunrise[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (daily && daily.sunset) elements.sunset.textContent = new Date(daily.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (daily && daily.precipitation_probability_max) elements.rainChance.textContent = `${daily.precipitation_probability_max[0]}%`;
    if (main && main.pressure) {
      elements.dashPressure.textContent = `${Math.round(main.pressure)} hPa`;
      elements.pressure.textContent = `${Math.round(main.pressure)} hPa`;
    }
    if (wind && wind.deg !== undefined) elements.windDirection.textContent = getWindDirection(wind.deg);
    elements.visibility.textContent = '\u2014';
  };

  const getWindDirection = (deg) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  const startLiveTime = () => {
    const update = () => {
      const now = new Date();
      elements.liveTime.textContent = now.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
        timeZone: state.timezone !== 'auto' ? state.timezone : undefined
      });
    };
    update();
    if (state._liveTimer) clearInterval(state._liveTimer);
    state._liveTimer = setInterval(update, 1000);
  };

  const toggleFavorite = () => {
    const name = state.currentCity;
    if (!name) return;
    if (Storage.isFavorite(name)) {
      Storage.removeFavorite(name);
      showToast(`Removed ${name} from favorites`, 'success');
    } else {
      Storage.addFavorite(name);
      showToast(`Added ${name} to favorites \u2B50`, 'success');
      elements.favBtn.classList.add('pop');
      setTimeout(() => elements.favBtn.classList.remove('pop'), 400);
    }
    updateFavBtn();
    renderSidebar();
  };

  const updateFavBtn = () => {
    if (state.currentCity && Storage.isFavorite(state.currentCity)) {
      elements.favBtn.classList.add('active');
      elements.favBtn.innerHTML = '\u2605';
    } else {
      elements.favBtn.classList.remove('active');
      elements.favBtn.innerHTML = '\u2606';
    }
  };

  const setWeatherBackground = (icon, mainCondition) => {
    const isNight = icon.endsWith('n');
    const condition = (mainCondition || '').toLowerCase();
    let bgClass = 'weather-bg-clear';
    if (isNight) bgClass = 'weather-bg-night';
    else if (condition.includes('thunderstorm')) bgClass = 'weather-bg-thunderstorm';
    else if (condition.includes('rain') || condition.includes('drizzle')) bgClass = condition.includes('drizzle') ? 'weather-bg-drizzle' : 'weather-bg-rain';
    else if (condition.includes('snow')) bgClass = 'weather-bg-snow';
    else if (condition.includes('cloud') || condition.includes('overcast')) bgClass = 'weather-bg-clouds';
    else if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) bgClass = 'weather-bg-mist';
    elements.weatherBg.className = `current-weather-bg ${bgClass}`;
  };

  const renderSidebar = () => {
    // Recent
    const cities = Storage.getRecentCities();
    elements.recentList.innerHTML = '';
    if (cities.length === 0) {
      elements.recentList.innerHTML = '<li class="recent-item" style="cursor:default;justify-content:center;opacity:0.6">No recent searches</li>';
    } else {
      cities.forEach(city => {
        const li = document.createElement('li');
        li.className = 'recent-item';
        const iconUrl = city.icon ? `https://openweathermap.org/img/wn/${city.icon}.png` : '';
        li.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            ${iconUrl ? `<img src="${iconUrl}" alt="" style="width:28px;height:28px;" loading="lazy" />` : ''}
            <span class="recent-item-city">${city.name}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="recent-item-temp">${city.temp || ''}\u00B0</span>
            <button class="recent-item-remove" data-city="${city.name}" aria-label="Remove">&times;</button>
          </div>`;
        li.addEventListener('click', (e) => {
          if (e.target.classList.contains('recent-item-remove')) return;
          state.currentCity = city.name; state.isGeolocation = false; state.coords = null; hideLocationBanner();
          Storage.saveLastCity(city.name); fetchWeatherByCity(city.name); closeSidebar();
        });
        li.querySelector('.recent-item-remove').addEventListener('click', (e) => {
          e.stopPropagation(); Storage.removeRecentCity(city.name); renderSidebar();
        });
        elements.recentList.appendChild(li);
      });
    }

    // Favorites
    const favs = Storage.getFavorites();
    elements.favList.innerHTML = '';
    if (favs.length === 0) {
      elements.favList.innerHTML = '<li class="recent-item" style="cursor:default;justify-content:center;opacity:0.6">No favorites yet \u2B50</li>';
    } else {
      favs.forEach(name => {
        const li = document.createElement('li');
        li.className = 'recent-item';
        li.innerHTML = `
          <span class="recent-item-city">${name}</span>
          <button class="recent-item-remove fav-remove" data-city="${name}" aria-label="Remove">&times;</button>`;
        li.addEventListener('click', (e) => {
          if (e.target.classList.contains('fav-remove')) return;
          state.currentCity = name; state.isGeolocation = false; state.coords = null; hideLocationBanner();
          Storage.saveLastCity(name); fetchWeatherByCity(name); closeSidebar();
        });
        li.querySelector('.fav-remove').addEventListener('click', (e) => {
          e.stopPropagation(); Storage.removeFavorite(name); renderSidebar();
          if (state.currentCity === name) updateFavBtn();
        });
        elements.favList.appendChild(li);
      });
    }
  };

  const startAutoRefresh = () => {
    if (state.autoRefreshInterval) clearInterval(state.autoRefreshInterval);
    state.autoRefreshInterval = setInterval(async () => {
      if (state.isFetching) return;
      if (state.isGeolocation && state.coords) {
        try {
          state.isFetching = true;
          const { weatherData, forecastData } = await fetchByCoords(state.coords.lat, state.coords.lon);
          state.currentCity = weatherData.name;
          renderWeather(weatherData, forecastData);
          showToast('Weather refreshed \u2705', 'success');
        } catch {}
        state.isFetching = false;
      } else if (state.currentCity) {
        fetchWeatherByCity(state.currentCity);
      }
    }, 300000);
  };

  const showLoading = () => {
    elements.loadingContainer.style.display = 'flex';
    elements.weatherDashboard.style.display = 'none';
    elements.errorContainer.classList.remove('active');
  };

  const hideLoading = () => { elements.loadingContainer.style.display = 'none'; };

  const showError = (message) => {
    hideLoading();
    elements.weatherDashboard.style.display = 'none';
    elements.errorContainer.classList.add('active');
    elements.errorMessage.textContent = message;
    elements.searchInput.value = state.currentCity || '';
  };

  const hideError = () => { elements.errorContainer.classList.remove('active'); };

  const formatDate = (date) => date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

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
