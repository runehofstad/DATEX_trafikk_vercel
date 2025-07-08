const axios = require("axios");
const xml2js = require("xml2js");

const API_URL = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetTravelTimeData/pullsnapshotdata";
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
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

    const response = await axios.get(API_URL, config);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    const locations = new Set();
    const locationDetails = [];
    
    if (result["ns2:messageContainer"] && 
        result["ns2:messageContainer"]["ns2:payload"] &&
        result["ns2:messageContainer"]["ns2:payload"][0]["ns10:physicalQuantity"]) {
      
      const quantities = result["ns2:messageContainer"]["ns2:payload"][0]["ns10:physicalQuantity"];
      
      quantities.forEach((quantity) => {
        const location = quantity["ns10:pertinentLocation"][0]["ns8:predefinedLocationReference"][0]["$"].id;
        if (!locations.has(location)) {
          locations.add(location);
          locationDetails.push({
            id: location,
            measurementTime: quantity["ns10:measurementTimeDefault"]?.[0] || "Unknown"
          });
        }
      });
    }
    
    // Check which configured stretch IDs exist in the data
    const configuredStretchIDs = [
      "B-R-SF", "B-R-ST", "B-R-SA", "B-S-FR", "B-S-FT", "B-S-FA",
      "B-F-SR", "B-F-ST", "B-F-SA", "B-A-RF", "B-T-RF", "B-R-RF",
      "B-O-BGF", "B-O-BGT", "B-O-BGA", "B-B-OGF", "B-B-OGT", "B-B-OGA"
    ];
    
    const matchingIDs = configuredStretchIDs.filter(id => locations.has(id));
    const missingIDs = configuredStretchIDs.filter(id => !locations.has(id));
    
    return res.status(200).json({
      success: true,
      totalLocations: locations.size,
      configuredStretchIDs: configuredStretchIDs,
      matchingIDs: matchingIDs,
      missingIDs: missingIDs,
      sampleLocations: locationDetails.slice(0, 20) // First 20 locations
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};