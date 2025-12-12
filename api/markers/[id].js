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

  const { id } = req.query;

  try {
    if (req.method === 'PUT') {
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

      return res.status(200).json(updatedMarker);
    }

    if (req.method === 'DELETE') {
      const deletedMarker = await prisma.marker.delete({
        where: { id }
      });

      return res.status(200).json(deletedMarker);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
