const axios = require("axios");
const xml2js = require("xml2js");

const API_URL = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetTravelTimeData/pullsnapshotdata";
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const debug = {
    timestamp: new Date().toISOString(),
    credentials: {
      hasUsername: !!API_USERNAME,
      hasPassword: !!API_PASSWORD,
      usernameLength: API_USERNAME ? API_USERNAME.length : 0
    },
    apiCall: {}
  };

  try {
    // Make API call
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
    
    debug.apiCall = {
      status: response.status,
      headers: {
        contentType: response.headers['content-type'],
        lastModified: response.headers['last-modified'],
        contentLength: response.headers['content-length']
      },
      dataLength: response.data ? response.data.length : 0
    };

    // Try to parse XML
    if (response.data) {
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      
      debug.xmlParsing = {
        success: true,
        rootElement: Object.keys(result)[0]
      };
      
      // Check for travel time data
      if (result["ns2:messageContainer"] && 
          result["ns2:messageContainer"]["ns2:payload"] &&
          result["ns2:messageContainer"]["ns2:payload"][0]["ns10:physicalQuantity"]) {
        
        const quantities = result["ns2:messageContainer"]["ns2:payload"][0]["ns10:physicalQuantity"];
        debug.dataInfo = {
          physicalQuantityCount: quantities.length,
          sampleLocation: quantities[0] ? 
            quantities[0]["ns10:pertinentLocation"]?.[0]["ns8:predefinedLocationReference"]?.[0]["$"].id : 
            'No location found'
        };
      } else {
        debug.dataInfo = {
          error: "No physical quantity data found in XML"
        };
      }
    }
    
    debug.success = true;
  } catch (error) {
    debug.success = false;
    debug.error = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    };
  }
  
  return res.status(200).json(debug);
};