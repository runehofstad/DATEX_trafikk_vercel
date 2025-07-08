module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // List all env vars that start with API_ or VERCEL_
  const envVars = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('API_') || key.startsWith('VERCEL_') || key === 'NODE_ENV') {
      envVars[key] = value ? `${value.substring(0, 3)}...(length: ${value.length})` : 'undefined';
    }
  }
  
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    envVars: envVars,
    envVarCount: Object.keys(process.env).length,
    specificChecks: {
      API_USERNAME: {
        exists: 'API_USERNAME' in process.env,
        hasValue: !!process.env.API_USERNAME,
        type: typeof process.env.API_USERNAME
      },
      API_PASSWORD: {
        exists: 'API_PASSWORD' in process.env,
        hasValue: !!process.env.API_PASSWORD,
        type: typeof process.env.API_PASSWORD
      }
    }
  });
};