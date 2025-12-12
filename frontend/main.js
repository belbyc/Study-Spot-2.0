// ⚠️ Your Mapbox token is already set below
mapboxgl.accessToken = "pk.eyJ1IjoiYmUxaW5kYSIsImEiOiJjbWoxaTFtMzIwMmg3M2VxMXo3OHFwemZxIn0.oVJz1gXIA5p1HGAD9JQkjg";

// Create map
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-79.64, 43.59],
  zoom: 11
});

let tempMarkerCoords = null;
let currentMarkers = {};
let currentMarkerData = {}; // Store actual marker data
let selectedMarkerId = null;

// ===== GEOCODING SEARCH WITH AUTOCOMPLETE =====
let searchTimeout;
let suggestionsCache = [];
let sessionToken = null;

// Generate a new session token for grouped requests
function generateSessionToken() {
  return "search_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

document.getElementById("searchInput").addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  const suggestionsList = document.getElementById("suggestions");
  
  if (query.length < 2) {
    suggestionsList.innerHTML = "";
    suggestionsList.classList.remove("active");
    return;
  }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      // Generate session token if needed
      if (!sessionToken) {
        sessionToken = generateSessionToken();
      }

      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&access_token=${mapboxgl.accessToken}&session_token=${sessionToken}&limit=5`
      );
      const data = await response.json();

      console.log("Suggest API response:", data); // Debug log to see structure

      if (!response.ok) {
        console.error("API Error:", data);
        suggestionsList.innerHTML = "<div class='suggestion-item'>Error loading suggestions</div>";
        suggestionsList.classList.add("active");
        return;
      }

      suggestionsCache = data.suggestions || [];
      
      if (suggestionsCache.length === 0) {
        suggestionsList.innerHTML = "<div class='suggestion-item'>No results found</div>";
        suggestionsList.classList.add("active");
        return;
      }

      suggestionsList.innerHTML = suggestionsCache
        .map((suggestion, index) => `
          <div class="suggestion-item" data-index="${index}">
            <div class="suggestion-text">${suggestion.name}</div>
            <div class="suggestion-address">${suggestion.place_name || ""}</div>
          </div>
        `)
        .join("");
      
      suggestionsList.classList.add("active");

      // Add click listeners to suggestions
      document.querySelectorAll(".suggestion-item").forEach((item) => {
        item.addEventListener("click", () => selectSuggestion(parseInt(item.dataset.index)));
      });
    } catch (error) {
      console.error("Suggestion error:", error);
      suggestionsList.innerHTML = "<div class='suggestion-item'>Error: " + error.message + "</div>";
      suggestionsList.classList.add("active");
    }
  }, 300); // Debounce for 300ms
});

function selectSuggestion(index) {
  const suggestion = suggestionsCache[index];
  if (!suggestion) return;

  document.getElementById("searchInput").value = suggestion.name;
  document.getElementById("suggestions").classList.remove("active");

  // Use the full address to get coordinates via Geocoding API
  const searchQuery = suggestion.full_address || suggestion.name;
  performGeocoding(searchQuery);
}

async function performGeocoding(query) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();

    if (data.features.length === 0) {
      alert("Could not find coordinates for this location.");
      return;
    }

    const result = data.features[0];
    const [lng, lat] = result.center;

    performSearch(lng, lat);
  } catch (error) {
    console.error("Geocoding error:", error);
    alert("Error finding coordinates: " + error.message);
  }
}

async function performSearch(lng, lat) {
  try {
    // Center map on result
    map.flyTo({
      center: [lng, lat],
      zoom: 15,
      duration: 1500
    });

    // Store coordinates for form submission
    tempMarkerCoords = { lng, lat };
    document.getElementById("formBox").classList.add("active");
    document.getElementById("titleInput").focus();
    
    // Reset session token for next search
    sessionToken = null;
  } catch (error) {
    console.error("Search error:", error);
    alert("Error searching for location: " + error.message);
  }
}

document.getElementById("searchBtn").onclick = async () => {
  const query = document.getElementById("searchInput").value.trim();
  
  if (!query) {
    alert("Please enter a place name or address");
    return;
  }

  // Use the first suggestion if available, otherwise use the query directly
  if (suggestionsCache.length > 0) {
    const searchQuery = suggestionsCache[0].full_address || suggestionsCache[0].name;
    performGeocoding(searchQuery);
  } else {
    performGeocoding(query);
  }
};

// Allow Enter key to search
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("searchBtn").click();
  }
});

// Close suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    document.getElementById("suggestions").classList.remove("active");
  }
});

// ===== MAP CLICK TO PLACE MARKER =====
map.on("click", (e) => {
  // Don't trigger if clicking on UI elements
  if (e.target.id !== "map") return;
  
  tempMarkerCoords = e.lngLat;
  document.getElementById("formBox").classList.add("active");
  document.getElementById("titleInput").focus();
});

// ===== FORM SUBMISSION =====
document.getElementById("submitBtn").onclick = async () => {
  const title = document.getElementById("titleInput").value.trim();
  const spotType = document.getElementById("spotType").value;
  const notes = document.getElementById("notesInput").value.trim();
  const rating = parseInt(document.getElementById("ratingInput").value) || 0;
  
  // Get amenity checkbox values
  const hasWifi = document.getElementById("hasWifi").checked;
  const hasOutlets = document.getElementById("hasOutlets").checked;
  const hasIndoorSeating = document.getElementById("hasIndoorSeating").checked;
  const hasOutdoorSeating = document.getElementById("hasOutdoorSeating").checked;
  const isQuiet = document.getElementById("isQuiet").checked;
  const hasFood = document.getElementById("hasFood").checked;

  if (!title) {
    alert("Spot name is required!");
    return;
  }

  if (!spotType) {
    alert("Please select a spot type!");
    return;
  }

  if (!tempMarkerCoords) {
    alert("Please select a location on the map or search for a place.");
    return;
  }

  // Check if we're editing or creating
  const submitBtn = document.getElementById("submitBtn");
  const editingId = submitBtn.dataset.editingId;
  const method = editingId ? "PUT" : "POST";
  const endpoint = editingId ? `/markers/${editingId}` : `/markers`;

  const payload = {
    title,
    spotType,
    notes,
    rating,
    latitude: tempMarkerCoords.lat,
    longitude: tempMarkerCoords.lng,
    hasWifi,
    hasOutlets,
    hasIndoorSeating,
    hasOutdoorSeating,
    isQuiet,
    hasFood
  };

  console.log(`${method} request to ${endpoint}:`, payload);

  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Server response error:", errorData);
      throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    // Clear form
    document.getElementById("formBox").classList.remove("active");
    document.getElementById("titleInput").value = "";
    document.getElementById("spotType").value = "other";
    document.getElementById("notesInput").value = "";
    document.getElementById("ratingInput").value = "";
    document.getElementById("searchInput").value = "";
    
    // Clear amenity checkboxes
    document.getElementById("hasWifi").checked = false;
    document.getElementById("hasOutlets").checked = false;
    document.getElementById("hasIndoorSeating").checked = false;
    document.getElementById("hasOutdoorSeating").checked = false;
    document.getElementById("isQuiet").checked = false;
    document.getElementById("hasFood").checked = false;
    
    // Reset button text and editing state
    const submitBtn = document.getElementById("submitBtn");
    const wasEditing = submitBtn.dataset.editingId;
    submitBtn.textContent = "Save Spot";
    delete submitBtn.dataset.editingId;
    
    tempMarkerCoords = null;

    await loadMarkers();
    
    // If we were editing, show the updated info card
    if (wasEditing && currentMarkerData[wasEditing]) {
      showInfoCard(currentMarkerData[wasEditing]);
    }
  } catch (error) {
    console.error("Error saving marker:", error);
    alert("Error saving spot. Make sure your backend is running on http://localhost:4000");
  }
};

// ===== CANCEL FORM =====
document.getElementById("cancelBtn").onclick = () => {
  document.getElementById("formBox").classList.remove("active");
  document.getElementById("titleInput").value = "";
  document.getElementById("spotType").value = "other";
  document.getElementById("notesInput").value = "";
  document.getElementById("ratingInput").value = "";
  
  // Clear amenity checkboxes
  document.getElementById("hasWifi").checked = false;
  document.getElementById("hasOutlets").checked = false;
  document.getElementById("hasIndoorSeating").checked = false;
  document.getElementById("hasOutdoorSeating").checked = false;
  document.getElementById("isQuiet").checked = false;
  document.getElementById("hasFood").checked = false;
  
  // Reset button text and editing state
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.textContent = "Save Spot";
  delete submitBtn.dataset.editingId;
  
  tempMarkerCoords = null;
};

// ===== CLOSE INFO CARD =====
document.getElementById("closeCard").onclick = () => {
  document.getElementById("infoCard").classList.remove("active");
  selectedMarkerId = null;
};

// ===== DELETE MARKER =====
document.getElementById("deleteBtn").onclick = async () => {
  if (!selectedMarkerId) return;

  if (!confirm("Are you sure you want to delete this spot?")) return;

  try {
    const response = await fetch(`/markers/${selectedMarkerId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    document.getElementById("infoCard").classList.remove("active");
    selectedMarkerId = null;
    await loadMarkers();
  } catch (error) {
    console.error("Error deleting marker:", error);
    alert("Error deleting spot");
  }
};

// ===== EDIT MARKER =====
document.getElementById("editBtn").onclick = async () => {
  if (!selectedMarkerId) return;

  // Find the marker data
  const markerData = currentMarkerData[selectedMarkerId];
  if (!markerData) return;

  // Close info card and open form
  document.getElementById("infoCard").classList.remove("active");
  
  // Populate form with marker data
  document.getElementById("titleInput").value = markerData.title || "";
  document.getElementById("spotType").value = markerData.spotType || "other";
  document.getElementById("notesInput").value = markerData.notes || "";
  document.getElementById("ratingInput").value = markerData.rating || "";
  
  // Set amenity checkboxes
  document.getElementById("hasWifi").checked = markerData.hasWifi || false;
  document.getElementById("hasOutlets").checked = markerData.hasOutlets || false;
  document.getElementById("hasIndoorSeating").checked = markerData.hasIndoorSeating || false;
  document.getElementById("hasOutdoorSeating").checked = markerData.hasOutdoorSeating || false;
  document.getElementById("isQuiet").checked = markerData.isQuiet || false;
  document.getElementById("hasFood").checked = markerData.hasFood || false;
  
  // Set coordinates for update
  tempMarkerCoords = { lat: markerData.latitude, lng: markerData.longitude };
  
  // Change button text to indicate edit mode
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.textContent = "Update Spot";
  submitBtn.dataset.editingId = selectedMarkerId;
  
  // Open form
  document.getElementById("formBox").classList.add("active");
  document.getElementById("titleInput").focus();
};

// ===== LOAD EXISTING MARKERS =====
async function loadMarkers() {
  try {
    const res = await fetch("/markers");
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    
    const markers = await res.json();

    // Remove old markers
    Object.values(currentMarkers).forEach(el => el.remove());
    currentMarkers = {};
    currentMarkerData = {}; // Clear marker data

    // Add new markers
    markers.forEach(m => {
      // Ensure spotType has a default value
      if (!m.spotType) {
        m.spotType = "other";
      }
      
      // Map spotType to color
      const spotTypeColors = {
        cafe: "#FFCE9F",
        library: "#A5D1D9",
        park: "#AAD19A",
        coworking: "#FBAFB8",
        other: "#D9BEA5"
      };
      
      const markerColor = spotTypeColors[m.spotType] || "#D9BEA5";
      
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.cssText = `
        width: 30px;
        height: 30px;
        background: ${markerColor};
        border-radius: 50%;
        border: 1px solid #555775;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #000;
        font-weight: bold;
        font-family: "rl-horizon", sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      el.textContent = m.rating ? `★${m.rating}` : "★";

      const marker = new mapboxgl.Marker(el)
        .setLngLat([m.longitude, m.latitude])
        .addTo(map);

      el.addEventListener("click", () => showInfoCard(m));
      currentMarkers[m.id] = marker;
      currentMarkerData[m.id] = m; // Store actual marker data
    });
  } catch (error) {
    console.error("Error loading markers:", error);
    alert("Error loading spots. Make sure your backend is running.");
  }
}

// ===== SHOW INFO CARD =====
function showInfoCard(marker) {
  selectedMarkerId = marker.id;
  
  // Apply spotType class to info card
  const infoCard = document.getElementById("infoCard");
  infoCard.className = "modal-info " + (marker.spotType || "other");
  
  document.getElementById("cardTitle").textContent = marker.title;
  document.getElementById("cardRating").textContent = marker.rating
    ? `★ ${marker.rating}/5`
    : "No rating";
  document.getElementById("cardNotes").textContent = marker.notes || "No notes added";
  
  // Display amenities
  const amenitiesDisplay = document.getElementById("cardAmenities");
  const amenities = [];
  
  if (marker.hasWifi) amenities.push("📶 WiFi");
  if (marker.hasOutlets) amenities.push("🔌 Outlets");
  if (marker.hasIndoorSeating) amenities.push("🪑 Indoor Seating");
  if (marker.hasOutdoorSeating) amenities.push("🌳 Outdoor Seating");
  if (marker.isQuiet) amenities.push("🤫 Quiet");
  if (marker.hasFood) amenities.push("🍕 Food");
  
  if (amenities.length > 0) {
    amenitiesDisplay.innerHTML = amenities
      .map(a => `<span class="amenity-tag">${a}</span>`)
      .join("");
  } else {
    amenitiesDisplay.innerHTML = "";
  }
  
  infoCard.classList.add("active");
}

// Load markers on page load
loadMarkers();

// ===== SIDE PANEL FUNCTIONALITY =====
const sidePanel = document.getElementById("sidePanel");
const togglePanelBtn = document.getElementById("togglePanelBtn");
const closePanelBtn = document.getElementById("closePanelBtn");
const spotsList = document.getElementById("spotsList");

// Toggle side panel open/close
togglePanelBtn.addEventListener("click", () => {
  sidePanel.classList.toggle("open");
});

closePanelBtn.addEventListener("click", () => {
  sidePanel.classList.remove("open");
});

// Close panel when clicking outside (on map)
document.getElementById("map").addEventListener("click", () => {
  if (sidePanel.classList.contains("open")) {
    sidePanel.classList.remove("open");
  }
});

// Populate side panel with spots
function populateSidePanel(markers) {
  spotsList.innerHTML = "";
  
  if (Object.keys(markers).length === 0) {
    spotsList.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No spots saved yet</p>';
    return;
  }

  Object.values(markers).forEach(marker => {
    const spotItem = document.createElement("div");
    spotItem.className = "spot-item " + (marker.spotType || "other");
    
    // Build amenities list with labels
    const amenityTags = [];
    if (marker.hasWifi) amenityTags.push("📶 WiFi");
    if (marker.hasOutlets) amenityTags.push("🔌 Outlets");
    if (marker.hasIndoorSeating) amenityTags.push("🪑 Indoor");
    if (marker.hasOutdoorSeating) amenityTags.push("🌳 Outdoor");
    if (marker.isQuiet) amenityTags.push("🤫 Quiet");
    if (marker.hasFood) amenityTags.push("🍕 Food");
    
    console.log("Marker:", marker.title, "Amenities:", amenityTags); // Debug log
    
    spotItem.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <p class="spot-item-title">${marker.title}</p>
      </div>
      ${marker.rating ? `<div class="spot-item-rating">★ ${marker.rating}/5</div>` : '<div class="spot-item-rating">No rating</div>'}
      <p class="spot-item-notes">${marker.notes || "No notes added"}</p>
      ${amenityTags.length > 0 ? `<div class="spot-item-amenities">${amenityTags.map(tag => `<span class="spot-amenity-tag">${tag}</span>`).join('')}</div>` : ''}
    `;
    
    // Click to show marker info
    spotItem.addEventListener("click", () => {
      showInfoCard(marker);
      // Optionally fly to marker
      map.flyTo({
        center: [marker.lng, marker.lat],
        zoom: 14,
        duration: 1000
      });
      sidePanel.classList.remove("open");
    });
    
    spotsList.appendChild(spotItem);
  });
}

// Update panel when markers change
const originalLoadMarkers = loadMarkers;
const newLoadMarkers = async function() {
  await originalLoadMarkers();
  populateSidePanel(currentMarkerData);
};
loadMarkers = newLoadMarkers;



// Load markers on page load
loadMarkers();
