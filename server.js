require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { extractDataFromXmlAndSaveToFile } = require("./extract_traveldata");
const { calculateTravelData } = require("./calculateTravelTimes");
const moment = require("moment-timezone");
const winston = require("winston");
const stretchData = require("./stretchdata.json");
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600, checkperiod: 610 });  // Time to live (TTL) in seconds


// Configure Winston logger
const logLevel = process.env.LOG_LEVEL || "info";

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

const app = express();
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Specific routes for HTML files
app.get('/test-api.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-api.html'));
});

app.get('/goodbarber-original.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'goodbarber-original.html'));
});

app.get('/goodbarber-widget.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'goodbarber-widget.html'));
});

app.get('/widget.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'widget.html'));
});

const API_URL =
  "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetTravelTimeData/pullsnapshotdata";
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;
const xml_file = path.join("cache", "travelTimeData.xml");
const json_filtered_file_path = path.join("cache", "travelTimeData_filtered.json");
const json_result_table_cache_file_path = path.join(
  "cache",
  "result_table_cache.json"
);

let lastAPIModified = null;
let lastApiCallTimeStamp = null;
const API_MODIFIED_INTERVAL = 5; // 5 minutes
const API_BACKOFF_INTERVAL = 5 * 1000; // add 5 sec

function canFetchFromAPI() {
  const now = Date.now();
  return (
    lastApiCallTimeStamp === null ||
    now - lastApiCallTimeStamp > API_BACKOFF_INTERVAL
  );
}

async function fetchDataFromAPI() {
  if (!canFetchFromAPI()) {
    logger.warn("Too many requests, limiting API calls to every 5 sec.");
    return { status: 429, error: "Too many requests" };
  }
  lastApiCallTimeStamp = Date.now();

  logger.info("Fetching data from API...");

  let config = {
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

  try {
    const response = await axios.get(API_URL, config);

    if (response.status === 200) {
      logger.info("Data fetched successfully.");
      return {
        status: 200,
        data: response.data,
        lastModified: response.headers["last-modified"],
      };
    }

    logger.error("API Error:", { status: response.status });
    return { status: response.status, error: "API Error", data: response.data };
  } catch (error) {
    if (error.response?.status === 304) {
      logger.info("Data not modified since last fetch.");
      return { status: 304, data: "Not Modified" };
    }
    logger.error("Error fetching data from API:", { message: error.message });
    return {
      status: error.response?.status || 500,
      error: error.message,
      details: error.response
        ? {
            status: error.response.status,
            headers: error.response.headers,
            data: error.response.data,
          }
        : "No response details available",
    };
  }
}

function writeXMLDataFileCache(data) {
  try {
    fs.writeFileSync(xml_file, data);
    logger.info("XML Cache updated");
  } catch (error) {
    logger.error("Error writing to XML cache:", { message: error.message });
  }
}

function writeResultTableCacheFile(data) {
  try {
    fs.writeFileSync(json_result_table_cache_file_path, JSON.stringify(data));
    logger.info("Result table cache file updated");
  } catch (error) {
    logger.error("Error writing to result table cache:", {
      message: error.message,
    });
  }
}

function getLastModifiedMinutes() {
  const norwayTime = moment.tz("Europe/Oslo");
  logger.debug("Norway time:", norwayTime.format());

  logger.debug("lastModified:", lastAPIModified);
  let lastModifiedDate = null;
  if (lastAPIModified) {
    lastModifiedDate = moment
      .tz(
        new Date(lastAPIModified.toString()), //.replace("GMT", "")),
        "Europe/Oslo"
      )
      .format();
    logger.debug("lastModifiedDate:", lastModifiedDate);
  }

  const lastModifiedMinutes = lastModifiedDate
    ? (norwayTime.valueOf() -
        moment.tz(lastModifiedDate, "Europe/Oslo").valueOf()) /
      (1000 * 60)
    : null;

  return lastModifiedMinutes;
}

function getAllStretchIDs() {
  const allStretchIDs = stretchData.map((location) => location.stretchIDs).flat();
  logger.debug("allStretchIDs", allStretchIDs);
  return allStretchIDs;
}

async function processXMLData(xmlData) {
  writeXMLDataFileCache(xmlData);
  const filteredData = await extractDataFromXmlAndSaveToFile(
    xmlData,
    json_filtered_file_path,
    getAllStretchIDs(),
    logger
  );

  // throw error if filteredData is undefined
  if (!filteredData) {
    throw new Error("filteredData is undefined");
  }
 
  const resultTableCache = calculateTravelData(filteredData, stretchData);
  writeResultTableCacheFile(resultTableCache); // save for debugging
  saveCache(resultTableCache);
  return resultTableCache;
}

// Function to save data to cache
function saveCache(data) {
  // You can define a key to store your data under, here we are using 'myData'
  cache.set('myData', data);
  logger.info("Data saved to cache");
}

// Function to load data from cache
function loadCache() {
  const cachedData = cache.get('myData');

  if (cachedData) {
    logger.info("Data loaded from cache");
    return cachedData;
  } else {
    logger.info("No data found in cache");
    return null;
  }
}

app.get("/GetData", async (req, res) => {
  const lastModifiedMinutes = getLastModifiedMinutes();
  const isCacheValid =
    lastModifiedMinutes !== null &&
    lastModifiedMinutes < API_MODIFIED_INTERVAL &&
    lastModifiedMinutes >= 0;
  const resultTableCache = loadCache();


  if (isCacheValid && resultTableCache) {
    logger.info(
      "Using cached data within 5 minutes from last modified API data..."
    );
    const responsePayload = {
      success: true,
      status: 200,
      fromcache: true,
      lastModified: lastAPIModified,
      lastModifiedMinutes: undefined,
      data: resultTableCache,
    };

    // if param like ?debug=true is passed, return also last Modified time
    if (req.query.debug === "true") {
      responsePayload.lastModifiedMinutes = lastModifiedMinutes; // debug data
    }

    return res.status(200).json(responsePayload);
  }

  logger.info("Cache expired or missing. Fetching new data...");

  const apiResponse = await fetchDataFromAPI();

  if (apiResponse.status === 200) {
    const newResultTable = await processXMLData(apiResponse.data);
    lastAPIModified = apiResponse.lastModified;

    return res.status(200).json({
      success: true,
      status: 200,
      fromcache: false,
      lastModified: lastAPIModified,
      data: newResultTable,
    });
  }

  if (apiResponse.status === 304 || apiResponse.status === 429) {
    if (resultTableCache) {
      return res.status(200).json({
        success: true,
        status: 200,
        fromcache: true,
        lastModified: lastAPIModified,
        data: resultTableCache,
      });
    }
  }

  logger.error("Failed to fetch new data and no cached data available.");
  return res.status(500).json({
    success: false,
    error: "No cached data available",
  });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3200;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(
    `Test API connection: http://localhost:${PORT}/GetTravelTimeData`
  );
});
