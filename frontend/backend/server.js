const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000; // or any other port you'd like

// Middleware
app.use(cors()); // Allow cross-origin requests (for React front-end)

// Sample API route
app.get('/api/status', (req, res) => {
  // Example data, replace with database logic if needed
  const statusData = [
    "success",
    "failure",
    "success",
    "failure",
    "success",
    "success"
  ];
  res.json({ statuses: statusData });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});