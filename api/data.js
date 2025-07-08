const axios = require("axios");
const xml2js = require("xml2js");
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600, checkperiod: 610 });

const API_URL = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetTravelTimeData/pullsnapshotdata";
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

// Stretch data
const stretchData = [
  {
    "stretch": "E39 Rådal - Fjøsanger",
    "stretchIDs": ["B-R-SF", "B-R-ST", "B-R-SA", "B-S-FR", "B-S-FT", "B-S-FA"]
  },
  {
    "stretch": "E39 Fjøsanger - Rådal",
    "stretchIDs": ["B-F-SR", "B-F-ST", "B-F-SA", "B-A-RF", "B-T-RF", "B-R-RF"]
  },
  {
    "stretch": "E39 Os - Bergen grense",
    "stretchIDs": ["B-O-BGF", "B-O-BGT", "B-O-BGA", "B-B-OGF", "B-B-OGT", "B-B-OGA"]
  },
  {
    "stretch": "E39 Bergen grense - Os",
    "stretchIDs": ["B-O-BGF", "B-O-BGT", "B-O-BGA", "B-B-OGF", "B-B-OGT", "B-B-OGA"]
  }
];

let lastAPIModified = null;
let lastApiCallTimeStamp = null;
const API_BACKOFF_INTERVAL = 5 * 1000;

async function extractDataFromXml(xmlData, locationIds) {
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlData);
  
  const extractedData = [];
  const processedLocations = new Set();
  
  const physicalQuantities = result["ns2:messageContainer"]["ns2:payload"][0]["ns10:physicalQuantity"];
  
  physicalQuantities.forEach((quantity) => {
    const location = quantity["ns10:pertinentLocation"][0]["ns8:predefinedLocationReference"][0]["$"].id;
    
    if (locationIds.includes(location) && !processedLocations.has(location)) {
      const basicData = quantity["ns10:basicData"][0];
      const travelTimeData = {
        location: location,
        travelTime: basicData["ns10:averageVehicleSpeed"]?.[0]["ns10:travelTime"]?.[0]["ns10:duration"]?.[0] || 
                   basicData["ns10:travelTime"]?.[0]["ns10:duration"]?.[0] || "Unknown",
        measurementTime: quantity["ns10:measurementTimeDefault"]?.[0] || "Unknown",
      };
      
      extractedData.push(travelTimeData);
      processedLocations.add(location);
    }
  });
  
  return extractedData;
}

function calculateTravelData(filteredData, stretchData) {
  const resultTable = [];
  
  stretchData.forEach((location) => {
    const stretchIDs = location.stretchIDs;
    const filteredDataStretch = filteredData.filter((data) =>
      stretchIDs.includes(data.location)
    );
    
    if (filteredDataStretch.length === 0) {
      return;
    }
    
    const now = filteredDataStretch.reduce((sum, data) => sum + data.travelTime, 0);
    const normal = stretchIDs.length * 60;
    const delay = Math.max(0, Math.round((now - normal) / 60));
    
    resultTable.push({
      id: location.stretch,
      stretch: location.stretch,
      time_now: Math.round(now / 60),
      time_normal: Math.round(normal / 60),
      delay: delay,
    });
  });
  
  return resultTable;
}

async function fetchDataFromAPI() {
  const now = Date.now();
  if (lastApiCallTimeStamp && now - lastApiCallTimeStamp < API_BACKOFF_INTERVAL) {
    return { status: 429, error: "Too many requests" };
  }
  lastApiCallTimeStamp = now;

  try {
    const config = {
      headers: {
        Accept: "application/xml, text/xml, */*",
        "Content-Type": "application/xml",
      },
      auth: {
        username: API_USERNAME,
        password: API_PASSWORD,
      },
    };

    if (lastAPIModified) {
      config.headers["If-Modified-Since"] = lastAPIModified;
    }

    const response = await axios.get(API_URL, config);

    if (response.status === 200) {
      lastAPIModified = response.headers["last-modified"];
      
      // Get all stretch IDs
      const allStretchIDs = stretchData.map((location) => location.stretchIDs).flat();
      
      // Extract and process XML data
      const filteredData = await extractDataFromXml(response.data, allStretchIDs);
      const resultTable = calculateTravelData(filteredData, stretchData);
      
      cache.set('trafficData', resultTable);
      cache.set('lastModified', lastAPIModified);
      
      return { status: 200, data: resultTable, lastModified: lastAPIModified };
    }

    return { status: response.status, error: "API Error" };
  } catch (error) {
    if (error.response?.status === 304) {
      return { status: 304, data: "Not Modified" };
    }
    console.error("Error fetching from API:", error.message);
    return { status: error.response?.status || 500, error: error.message };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check cache first
  const cachedData = cache.get('trafficData');
  const cachedLastModified = cache.get('lastModified');
  
  if (cachedData) {
    return res.status(200).json({
      success: true,
      data: cachedData,
      lastModified: cachedLastModified,
      fromCache: true
    });
  }

  // Fetch new data
  const apiResponse = await fetchDataFromAPI();
  
  if (apiResponse.status === 200) {
    return res.status(200).json({
      success: true,
      data: apiResponse.data,
      lastModified: apiResponse.lastModified,
      fromCache: false
    });
  }

  // No data available
  return res.status(200).json({
    success: false,
    error: "No cached data available"
  });
};