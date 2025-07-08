const axios = require("axios");
const xml2js = require("xml2js");

const API_URL = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetTravelTimeData/pullsnapshotdata";

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    env: {
      hasUsername: !!process.env.API_USERNAME,
      hasPassword: !!process.env.API_PASSWORD,
      usernameLength: process.env.API_USERNAME ? process.env.API_USERNAME.length : 0,
      passwordLength: process.env.API_PASSWORD ? process.env.API_PASSWORD.length : 0,
      nodeVersion: process.version,
      vercelRegion: process.env.VERCEL_REGION || 'unknown'
    },
    apiTest: {}
  };

  try {
    // Test API call
    const config = {
      headers: {
        Accept: "application/xml, text/xml, */*",
        "Content-Type": "application/xml",
      },
      auth: {
        username: process.env.API_USERNAME || '',
        password: process.env.API_PASSWORD || '',
      },
      timeout: 10000, // 10 second timeout
    };

    debugInfo.apiTest.url = API_URL;
    debugInfo.apiTest.authConfigured = !!(config.auth.username && config.auth.password);

    const startTime = Date.now();
    const response = await axios.get(API_URL, config);
    const endTime = Date.now();

    debugInfo.apiTest.responseTime = endTime - startTime;
    debugInfo.apiTest.status = response.status;
    debugInfo.apiTest.statusText = response.statusText;
    debugInfo.apiTest.headers = {
      contentType: response.headers['content-type'],
      lastModified: response.headers['last-modified'],
      contentLength: response.headers['content-length']
    };
    debugInfo.apiTest.dataReceived = !!response.data;
    debugInfo.apiTest.dataLength = response.data ? response.data.length : 0;
    
    // Try to parse XML
    if (response.data) {
      try {
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        debugInfo.apiTest.xmlParsed = true;
        debugInfo.apiTest.xmlRootElement = Object.keys(result)[0];
      } catch (xmlError) {
        debugInfo.apiTest.xmlParsed = false;
        debugInfo.apiTest.xmlError = xmlError.message;
      }
    }

    debugInfo.success = true;
  } catch (error) {
    debugInfo.success = false;
    debugInfo.error = {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data ? 
          (typeof error.response.data === 'string' ? 
            error.response.data.substring(0, 500) : 
            JSON.stringify(error.response.data).substring(0, 500)
          ) : null
      } : null
    };
  }

  return res.status(200).json(debugInfo);
};