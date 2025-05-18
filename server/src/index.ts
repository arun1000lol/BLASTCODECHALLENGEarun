import app from './app';

const PORT = process.env.PORT || 5000;


import fs from 'fs';
import path from 'path';
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});