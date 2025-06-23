import pool from "./db.js";

export const findOrCreateUser = async (deviceId) => {
  const result = await pool.query(
    `INSERT INTO users (deviceid)
     VALUES ($1)
     ON CONFLICT (deviceid) DO UPDATE SET deviceid = EXCLUDED.deviceid
     RETURNING userid`,
    [deviceId]
  );
  return result.rows[0].userid;
};
