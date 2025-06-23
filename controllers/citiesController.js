import fs from "fs";
import axios from "axios";
import { getLocalTimeForTimezoneOffset } from "../utils/timeUtils.js";
import { findOrCreateUser } from "../utils/userUtils.js";

import { OPEN_WEATHER_API_KEY } from "../config.js";

import pool from "../utils/db.js";

export const getCities = async (req, res) => {
  const { device_id } = req.query;
  if (!device_id) return res.status(400).json({ error: "Device ID missing" });

  const userId = await findOrCreateUser(device_id);

  try {
    const cities = await pool.query(
      `SELECT c.citiid AS id, c.city AS name, c.country, c.lat, c.lon
       FROM usercities uc
       JOIN cities c ON uc.cityid = c.citiid
       WHERE uc.userid = $1`,
      [userId]
    );

    const enriched = await Promise.all(
      cities.rows.map(async (city) => {
        try {
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
              city.name
            )}&units=metric&appid=${OPEN_WEATHER_API_KEY}`
          );
          const data = response.data;
          return {
            ...city,
            temp: Math.round(data.main.temp),
            icon: data.weather[0].main.toLowerCase(),
            time: getLocalTimeForTimezoneOffset(data.timezone),
          };
        } catch {
          return city;
        }
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Failed to get cities" });
  }
};

export const addCity = async (req, res) => {
  const { name, device_id } = req.body;

  if (!name || !device_id)
    return res.status(400).json({ error: "Invalid input" });

  const cityName = name.toLowerCase();
  let temp = 15,
    icon = "cloudy",
    time = "12:00",
    country = "unknown",
    lat = 0,
    lon = 0;

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${OPEN_WEATHER_API_KEY}`
    );

    const data = response.data;
    const timezoneOffset = data.timezone;
    time = getLocalTimeForTimezoneOffset(timezoneOffset);
    temp = Math.round(data.main.temp);
    icon = data.weather[0].main.toLowerCase();
    lat = data.coord.lat;
    lon = data.coord.lon;

    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    country = regionNames.of(data.sys.country) || data.sys.country;
  } catch {
    console.warn("Weather fetch failed, using defaults.");
  }

  const userId = await findOrCreateUser(device_id);

  const cityRes = await pool.query(
    `INSERT INTO cities (city, country, lat, lon)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (city, country, lat, lon)
     DO UPDATE SET city = EXCLUDED.city
     RETURNING citiid`,
    [cityName, country, lat, lon]
  );
  const cityId = cityRes.rows[0].citiid;

  await pool.query(
    `INSERT INTO usercities (userid, cityid)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, cityId]
  );

  res.json({ id: cityId, name: cityName, country, temp, icon, time });
};

export const deleteCity = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`DELETE FROM usercities WHERE cityid = $1`, [id]);

    const userCityCount = await pool.query(
      `SELECT COUNT(*) FROM usercities WHERE cityid = $1`,
      [id]
    );

    if (parseInt(userCityCount.rows[0].count) === 0) {
      await pool.query(`DELETE FROM cities WHERE citiid = $1`, [id]);
    }

    res.json({ success: true, message: "City deleted" });
  } catch (err) {
    console.error("Error deleting city:", err);
    res.status(500).json({ error: "Failed to delete city" });
  }
};
