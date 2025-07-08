module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasApiUsername: !!process.env.API_USERNAME,
      hasApiPassword: !!process.env.API_PASSWORD,
      nodeVersion: process.version,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      credentials: {
        usernameLength: process.env.API_USERNAME ? process.env.API_USERNAME.length : 0,
        passwordLength: process.env.API_PASSWORD ? process.env.API_PASSWORD.length : 0,
        usernameFirst3: process.env.API_USERNAME ? process.env.API_USERNAME.substring(0, 3) + '***' : 'NOT SET',
        passwordFirst3: process.env.API_PASSWORD ? process.env.API_PASSWORD.substring(0, 3) + '***' : 'NOT SET'
      }
    },
    deploymentInfo: {
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    }
  };
  
  return res.status(200).json(healthCheck);
};