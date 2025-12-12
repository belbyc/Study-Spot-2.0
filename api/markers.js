import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // GET all markers
    if (req.method === 'GET') {
      const markers = await prisma.marker.findMany({
        orderBy: { createdAt: "desc" }
      });
      res.status(200).json(markers);
    }
    // POST new marker
    else if (req.method === 'POST') {
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
    }
    else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
}
