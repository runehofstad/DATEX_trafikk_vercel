const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

// Function to extract travel time data from XML
async function extractDataFromXml(xmlData, locationIds) {
  const parser = new xml2js.Parser();

  // Parse XML to JSON
  const result = await parser.parseStringPromise(xmlData);

  // Extract relevant data
  const extractedData = [];

  // Keep track of processed location IDs to skip duplicates
  const processedLocations = new Set();

  const physicalQuantities =
    result["ns2:messageContainer"]["ns2:payload"][0]["ns10:physicalQuantity"];

  physicalQuantities.forEach((quantity) => {
    const location =
      quantity["ns10:pertinentLocation"][0][
        "ns8:predefinedLocationReference"
      ][0]["$"].id;

    // Only process if the location ID is in the target list and hasn't been processed yet
    if (locationIds.includes(location) && !processedLocations.has(location)) {
      const basicData = quantity["ns10:basicData"][0];
      const travelTimeData = {
        location_id: location,
        travel_time: basicData["ns10:travelTime"]
          ? basicData["ns10:travelTime"][0]["ns10:duration"][0]
          : undefined,
        free_flow_time: basicData["ns10:freeFlowTravelTime"]
          ? basicData["ns10:freeFlowTravelTime"][0]["ns10:duration"][0]
          : undefined,
        travel_time_trend_type: basicData["ns10:travelTimeTrendType"]
          ? basicData["ns10:travelTimeTrendType"][0]
          : undefined,
      };

      // Filter out undefined properties
      Object.keys(travelTimeData).forEach((key) => {
        if (travelTimeData[key] === undefined) {
          delete travelTimeData[key];
        }
      });

      // Add the processed location ID to the set
      processedLocations.add(location);
      extractedData.push(travelTimeData);
    }
  });

  return extractedData;
}

async function extractDataFromXmlAndSaveToFile(xmlData, savePath, locationIds, logger) {
  try {
    const extractedData = await extractDataFromXml(xmlData, locationIds);
    const data = JSON.stringify(extractedData, null, 2);
    fs.writeFileSync(savePath, data);
    logger.info("Data successfully written to file.");
    return extractedData;
  } catch (err) {
    logger.error(
      "Error extracting data or writing to file:",
      err.message.substring(0, 100)
    );
  }
}

module.exports = {
  extractDataFromXmlAndSaveToFile,
};

// example usage for importing this module in another file
// const { extractDataFromXml } = require("./extract_traveldata");

// test extractDataFromXmlAndSaveToFile function

/*
const xml_file = path.join('cache', 'travelTimeData.xml');
const json_filtered_file = path.join('cache', 'travelTimeData_filtered.json');

const location_ids = ['100276', '100377'];
extractDataFromXmlAndSaveToFile(xml_file, json_filtered_file, location_ids);

 */