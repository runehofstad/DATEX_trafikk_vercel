const axios = require("axios");
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600, checkperiod: 610 });

const API_URL = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetTravelTimeData/pullsnapshotdata";
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

let lastAPIModified = null;
let lastApiCallTimeStamp = null;
const API_BACKOFF_INTERVAL = 5 * 1000;

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
      // Here you would normally process the XML data
      // For now, return mock data
      const mockData = [
        { id: 1, stretch: "E39 Rådal - Fjøsanger", time_now: 5, time_normal: 4, delay: 1 },
        { id: 2, stretch: "E39 Fjøsanger - Rådal", time_now: 4, time_normal: 4, delay: 0 },
        { id: 3, stretch: "E39 Os - Bergen grense", time_now: 12, time_normal: 10, delay: 2 }
      ];
      cache.set('trafficData', mockData);
      return { status: 200, data: mockData, lastModified: lastAPIModified };
    }

    return { status: response.status, error: "API Error" };
  } catch (error) {
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
  if (cachedData) {
    return res.status(200).json({
      success: true,
      data: cachedData,
      lastModified: lastAPIModified,
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