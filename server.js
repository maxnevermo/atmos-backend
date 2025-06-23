import express from "express";
import cors from "cors";

import citiesRoutes from "./routes/citiesRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/cities", citiesRoutes);
app.use("/weather", weatherRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
