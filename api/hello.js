// Простейший API endpoint
module.exports = function handler(req, res) {
  try {
    console.log('Hello endpoint called:', req.method);
    res.status(200).json({ 
      message: 'Hello from Vercel API!',
      timestamp: new Date().toISOString(),
      method: req.method
    });
  } catch (error) {
    console.error('Error in hello endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
