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

  const { id } = req.query;

  try {
    // PUT (update) marker
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

      res.json(updatedMarker);
    }
    // DELETE marker
    else if (req.method === 'DELETE') {
      const deletedMarker = await prisma.marker.delete({
        where: { id }
      });

      res.json(deletedMarker);
    }
    else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
}
