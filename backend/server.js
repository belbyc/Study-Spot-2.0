import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// GET all markers
app.get("/markers", async (req, res) => {
  try {
    const markers = await prisma.marker.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(markers);
  } catch (error) {
    console.error("Error fetching markers:", error);
    res.status(500).json({ error: "Failed to fetch markers" });
  }
});

// POST new marker
app.post("/markers", async (req, res) => {
  try {
    const { title, spotType, notes, rating, latitude, longitude, hasWifi, hasOutlets, hasIndoorSeating, hasOutdoorSeating, isQuiet, hasFood } = req.body;

    if (!title || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Title, latitude, and longitude are required" });
    }

    const newMarker = await prisma.marker.create({
      data: {
        title,
        spotType: spotType || "other",
        notes: notes || null,
        rating: rating || null,
        latitude,
        longitude,
        hasWifi: hasWifi || false,
        hasOutlets: hasOutlets || false,
        hasIndoorSeating: hasIndoorSeating || false,
        hasOutdoorSeating: hasOutdoorSeating || false,
        isQuiet: isQuiet || false,
        hasFood: hasFood || false
      }
    });

    res.status(201).json(newMarker);
  } catch (error) {
    console.error("Error creating marker:", error);
    res.status(500).json({ error: "Failed to create marker" });
  }
});

// PUT (update) marker
app.put("/markers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, spotType, notes, rating, hasWifi, hasOutlets, hasIndoorSeating, hasOutdoorSeating, isQuiet, hasFood } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const updatedMarker = await prisma.marker.update({
      where: { id },
      data: {
        title,
        spotType: spotType || "other",
        notes: notes || null,
        rating: rating || null,
        hasWifi: hasWifi || false,
        hasOutlets: hasOutlets || false,
        hasIndoorSeating: hasIndoorSeating || false,
        hasOutdoorSeating: hasOutdoorSeating || false,
        isQuiet: isQuiet || false,
        hasFood: hasFood || false
      }
    });

    res.json(updatedMarker);
  } catch (error) {
    console.error("Error updating marker:", error);
    res.status(500).json({ error: "Failed to update marker" });
  }
});

// DELETE marker
app.delete("/markers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMarker = await prisma.marker.delete({
      where: { id }
    });

    res.json(deletedMarker);
  } catch (error) {
    console.error("Error deleting marker:", error);
    res.status(500).json({ error: "Failed to delete marker" });
  }
});

// Serve index.html for all other routes (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log("🚀 Express is live at http://localhost:" + PORT);
  console.log("✅ Prisma connected to MongoDB");
  console.log("🗺️ Study Spots Map is ready!");
});
