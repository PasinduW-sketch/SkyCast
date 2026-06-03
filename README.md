# SkyCast - Weather Forecast Web Application

A modern, responsive weather forecasting web application built with vanilla JavaScript, CSS3, and the OpenWeatherMap API. Features a glassmorphism design, dark/light mode, and real-time weather data.

## Features

- **Real-time Weather** - Current temperature, humidity, wind speed, feels-like temperature, and weather conditions
- **5-Day Forecast** - Daily weather predictions with temperature ranges and conditions
- **City Search** - Search weather by any city name worldwide
- **Geolocation** - Auto-detect your location for instant weather data
- **Dark/Light Mode** - Toggle between dark and light themes
- **Unit Switch** - Toggle between Celsius and Fahrenheit
- **Recent Cities** - Recently searched cities saved to Local Storage
- **Auto-Refresh** - Weather data refreshes automatically every 5 minutes
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Glassmorphism UI** - Modern glass-effect design with smooth animations
- **Weather-Based Backgrounds** - Dynamic backgrounds matching current conditions

## Technologies Used

- **HTML5** - Semantic markup structure
- **CSS3** - Flexbox, Grid, CSS custom properties, animations, glassmorphism
- **JavaScript (ES6+)** - Async/await, Fetch API, DOM manipulation, Local Storage
- **OpenWeatherMap API** - Current weather and 5-day forecast data

## API Setup

1. Sign up for a free API key at [OpenWeatherMap](https://openweathermap.org/api)
2. Open `js/api.js`
3. Replace `YOUR_API_KEY_HERE` with your actual API key:
   ```js
   const API_KEY = 'your_actual_api_key_here';
   ```

## How to Run

1. Clone or download this repository
2. Add your OpenWeatherMap API key (see API Setup above)
3. Open `index.html` in any modern web browser

No build tools or server required - it works directly in the browser.

## Project Structure

```
weather-app/
  index.html          - Main HTML document
  css/style.css       - All styles, themes, and animations
  js/
    app.js            - Main application logic and UI rendering
    api.js            - OpenWeatherMap API integration
    storage.js        - Local Storage management
  assets/icons/       - Weather icons (loaded from CDN)
  README.md           - Documentation
```

## Portfolio Context

This project demonstrates proficiency in:

- **Frontend Development** - Semantic HTML, modern CSS, vanilla JavaScript
- **API Integration** - RESTful API consumption, async operations, error handling
- **Responsive Web Design** - Mobile-first approach, cross-device compatibility
- **JavaScript Programming** - ES6+ features, module pattern, DOM manipulation
- **Web Application Development** - State management, local storage, event handling

## License

MIT
