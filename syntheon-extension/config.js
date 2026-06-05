// Extension configuration - Update this when deploying
const EXTENSION_CONFIG = {
  API_BASE_URL: 'https://uncapacious-lauraceous-verna.ngrok-free.dev',
};

// Helper to get full API URL
function getApiUrl(path) {
  return `${EXTENSION_CONFIG.API_BASE_URL}${path}`;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EXTENSION_CONFIG, getApiUrl };
}
