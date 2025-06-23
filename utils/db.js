import { DATABASE_URL } from "../config.js";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
