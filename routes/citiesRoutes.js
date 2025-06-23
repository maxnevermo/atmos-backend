import express from "express";

import {
  getCities,
  addCity,
  deleteCity,
} from "../controllers/citiesController.js";

const router = express.Router();

router.get("/", getCities);
router.post("/", addCity);
router.delete("/:id", deleteCity);

export default router;
