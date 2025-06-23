import axios from "axios";
import {
  OPEN_WEATHER_API_KEY,
  WEATHER_API_KEY,
  IQAIR_API_KEY,
} from "../config.js";

export const getWeatherByCity = async (req, res) => {
  const { city } = req.params;

  try {
    const currentRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&units=metric&appid=${OPEN_WEATHER_API_KEY}`
    );
    const current = currentRes.data;

    const forecastRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast/daily?q=${encodeURIComponent(
        city
      )}&units=metric&cnt=1&appid=${OPEN_WEATHER_API_KEY}`
    );
    const forecast = forecastRes.data.list?.[0];

    const geoRes = await axios.get(
      `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        city
      )}&limit=1&appid=${OPEN_WEATHER_API_KEY}`
    );
    const [location] = geoRes.data;
    if (!location) return res.status(404).json({ error: "City not found" });

    const { lat, lon } = location;

    const uvRes = await axios.get(
      `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`
    );
    const uvIndex = uvRes.data.current.uv;

    const hourlyRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        city
      )}&units=metric&cnt=6&appid=${OPEN_WEATHER_API_KEY}`
    );

    const hourlyData = hourlyRes.data.list.map((entry) => {
      const date = new Date(entry.dt * 1000);
      const time = date
        .toLocaleTimeString([], { hour: "numeric", hour12: true })
        .toLowerCase();
      return {
        time,
        temp: Math.round(entry.main.temp),
        condition: entry.weather[0].main.toLowerCase(),
      };
    });

    const pollutionRes = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_API_KEY}`
    );

    const aqiRes = await axios.get(
      `http://api.airvisual.com/v2/nearest_city??lat=${lat}&lon=${lon}}&key=${IQAIR_API_KEY}`
    );

    const airData = pollutionRes.data.list[0];

    const localTime = new Date(
      Date.now() + current.timezone * 1000
    ).toLocaleTimeString([], {
      hour: "2-digit",
    });

    res.json({
      name: current.name,
      temp: Math.round(current.main.temp),
      icon: current.weather[0].main.toLowerCase(),
      time: localTime,
      temp_max: Math.round(forecast?.temp.max ?? current.main.temp),
      temp_min: Math.round(forecast?.temp.min ?? current.main.temp),
      humidity: current.main.humidity,
      wind_speed: current.wind.speed,
      feels_like: Math.round(current.main.feels_like),
      uv_index: uvIndex,
      forecast_next_hours: hourlyData,
      air_quality: {
        aqi: aqiRes.data,
        components: airData.components,
      },
    });
  } catch (err) {
    console.error("Weather error:", err?.response?.data || err.message);
    res.status(500).json({ error: "City not found or API error." });
  }
};
