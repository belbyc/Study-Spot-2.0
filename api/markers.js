import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Forwarded-Host, Accept-Language, Content-Language, Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "✗ Not set");
    
    if (req.method === 'GET') {
      const markers = await prisma.marker.findMany({
        orderBy: { createdAt: "desc" }
      });
      return res.status(200).json(markers);
    }

    if (req.method === 'POST') {
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

      return res.status(201).json(newMarker);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error", details: error.toString() });
  }
}
