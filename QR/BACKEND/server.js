const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Generate QR code endpoint
app.post('/api/generate-qr', upload.single('customImage'), async (req, res) => {
  try {
    const { url, emoji, customText, useCustomPattern } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    let qrCodeDataURL;

    if (useCustomPattern === 'true' && (emoji || customText || req.file)) {
      // Generate QR code with custom pattern
      qrCodeDataURL = await generateCustomQRCode(url, emoji, customText, req.file);
    } else {
      // Generate standard QR code
      qrCodeDataURL = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }

    // Clean up uploaded file if it exists
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }

    // Validate QR code readability
    const validationResult = await validateQRCodeReadability(url, qrCodeDataURL, emoji, customText, req.file);

    res.json({ 
      success: true, 
      qrCode: qrCodeDataURL,
      originalUrl: url,
      isReadable: validationResult.isReadable,
      warning: validationResult.warning
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Function to generate custom QR code
async function generateCustomQRCode(url, emoji, customText, uploadedFile) {
  try {
    if (emoji) {
      // For emoji patterns, create QR code with emoji dots
      return await generateEmojiQRCode(url, emoji);
    } else if (customText) {
      // For text patterns, create QR code with text dots
      return await generateTextQRCode(url, customText);
    } else if (uploadedFile) {
      // For uploaded images, create QR code with image dots
      return await generateImageQRCode(url, uploadedFile.path);
    }
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

  } catch (error) {
    console.error('Error creating custom QR code:', error);
    throw error;
  }
}

// Function to generate text-based QR code
async function generateTextQRCode(url, customText) {
  try {
    // First, get the QR code matrix
    const qrMatrix = await QRCode.create(url, {
      width: 300,
      margin: 2
    });

    const matrix = qrMatrix.modules;
    const size = matrix.size;
    const cellSize = Math.floor(300 / size);
    const margin = 2;
    const totalSize = size * cellSize + (margin * 2);
    
    let svg = `<svg width="${totalSize}" height="${totalSize}" xmlns="http://www.w3.org/2000/svg">`;
    
    svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`;
    
    // Draw QR code with text
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (matrix.get(row, col)) {
          const x = margin + col * cellSize;
          const y = margin + row * cellSize;
          const fontSize = Math.floor(cellSize * 0.6);
          
          svg += `<text x="${x + cellSize/2}" y="${y + cellSize/2 + fontSize/3}" 
                         font-size="${fontSize}" 
                         font-family="Arial, sans-serif"
                         font-weight="bold"
                         text-anchor="middle" 
                         dominant-baseline="middle"
                         fill="black">${customText}</text>`;
        }
      }
    }
    
    svg += '</svg>';
    
    // Convert SVG to data URL
    const svgBuffer = Buffer.from(svg);
    const dataURL = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
    
    return dataURL;
  } catch (error) {
    console.error('Error creating text QR code:', error);
    throw error;
  }
}

// Function to generate emoji-based QR code
async function generateEmojiQRCode(url, emoji) {
  try {
    // First, get the QR code matrix
    const qrMatrix = await QRCode.create(url, {
      width: 300,
      margin: 2
    });

    const matrix = qrMatrix.modules;
    const size = matrix.size;
    const cellSize = Math.floor(300 / size);
    const margin = 2;
    const totalSize = size * cellSize + (margin * 2);
    
    // Create SVG with emojis
    let svg = `<svg width="${totalSize}" height="${totalSize}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add white background
    svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`;
    
    // Draw QR code with emojis
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (matrix.get(row, col)) {
          const x = margin + col * cellSize;
          const y = margin + row * cellSize;
          const fontSize = Math.floor(cellSize * 0.8);
          
          svg += `<text x="${x + cellSize/2}" y="${y + cellSize/2 + fontSize/3}" 
                         font-size="${fontSize}" 
                         text-anchor="middle" 
                         dominant-baseline="middle">${emoji}</text>`;
        }
      }
    }
    
    svg += '</svg>';
    
    // Convert SVG to data URL
    const svgBuffer = Buffer.from(svg);
    const dataURL = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
    
    return dataURL;
  } catch (error) {
    console.error('Error creating emoji QR code:', error);
    throw error;
  }
}

// Function to generate image-based QR code
async function generateImageQRCode(url, imagePath) {
  try {
    // First, get the QR code matrix
    const qrMatrix = await QRCode.create(url, {
      width: 300,
      margin: 2
    });

    const matrix = qrMatrix.modules;
    const size = matrix.size;
    const cellSize = Math.floor(300 / size);
    const margin = 2;
    const totalSize = size * cellSize + (margin * 2);
    
    // Process the uploaded image to create small tiles
    const imageBuffer = await sharp(imagePath)
      .resize(cellSize, cellSize, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();
    
    const imageDataURL = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    // Create SVG with image tiles
    let svg = `<svg width="${totalSize}" height="${totalSize}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add white background
    svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`;
    
    // Define the image pattern
    svg += `<defs>
              <pattern id="qrImage" x="0" y="0" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                <image href="${imageDataURL}" x="0" y="0" width="${cellSize}" height="${cellSize}"/>
              </pattern>
            </defs>`;
    
    // Draw QR code with image tiles
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (matrix.get(row, col)) {
          const x = margin + col * cellSize;
          const y = margin + row * cellSize;
          
          svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="url(#qrImage)"/>`;
        }
      }
    }
    
    svg += '</svg>';
    
    // Convert SVG to data URL
    const svgBuffer = Buffer.from(svg);
    const dataURL = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
    
    return dataURL;
  } catch (error) {
    console.error('Error creating image QR code:', error);
    throw error;
  }
}

// Function to validate QR code readability
async function validateQRCodeReadability(originalUrl, customQRCode, emoji, customText, uploadedFile) {
  try {
    // Generate a standard QR code for comparison
    const standardQR = await QRCode.toDataURL(originalUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Get the original QR matrix
    const originalMatrix = await QRCode.create(originalUrl, {
      width: 300,
      margin: 2
    });

    const matrix = originalMatrix.modules;
    const size = matrix.size;
    
    // Calculate readability score based on pattern complexity
    let readabilityScore = 100;
    let warning = null;

    if (emoji) {
      // Check emoji complexity
      const emojiComplexity = getEmojiComplexity(emoji);
      readabilityScore -= emojiComplexity;
      
      if (readabilityScore < 70) {
        warning = `Warning: The emoji "${emoji}" may make the QR code difficult to scan. Consider using a simpler emoji or standard QR code.`;
      }
    }

    if (customText) {
      // Check text complexity
      const textComplexity = getTextComplexity(customText);
      readabilityScore -= textComplexity;
      
      if (readabilityScore < 70) {
        warning = `Warning: The text "${customText}" may make the QR code difficult to scan. Consider using shorter text or standard QR code.`;
      }
    }

    if (uploadedFile) {
      // Check image complexity
      const imageComplexity = await getImageComplexity(uploadedFile.path);
      readabilityScore -= imageComplexity;
      
      if (readabilityScore < 70) {
        warning = `Warning: The uploaded image may make the QR code difficult to scan. Consider using a simpler image or standard QR code.`;
      }
    }

    // Check QR code size and complexity
    const qrComplexity = getQRComplexity(matrix, size);
    readabilityScore -= qrComplexity;

    if (readabilityScore < 50) {
      warning = `Warning: This QR code may be difficult to scan due to its complexity. Consider using a shorter URL or standard QR code.`;
    }

    return {
      isReadable: readabilityScore >= 70,
      warning: warning
    };

  } catch (error) {
    console.error('Error validating QR code:', error);
    return {
      isReadable: true,
      warning: null
    };
  }
}

// Function to get emoji complexity score
function getEmojiComplexity(emoji) {
  const complexityMap = {
    '❤️': 5,   // Simple, high contrast
    '💙': 5,   // Simple, high contrast
    '💚': 5,   // Simple, high contrast
    '💛': 8,   // Yellow can be problematic
    '💜': 6,   // Purple is okay
    '🖤': 3,   // Black is perfect
    '🤍': 10,  // White is problematic
    '🔥': 7,   // Complex shape
    '⭐': 6,   // Star shape
    '🌟': 8    // Complex star
  };
  
  return complexityMap[emoji] || 15; // Default high complexity for unknown emojis
}

// Function to get text complexity score
function getTextComplexity(text) {
  let complexity = 0;
  
  // Length penalty
  complexity += text.length * 2;
  
  // Character complexity
  for (let char of text) {
    if (char.match(/[A-Z]/)) complexity += 1;      // Uppercase letters
    else if (char.match(/[a-z]/)) complexity += 2; // Lowercase letters
    else if (char.match(/[0-9]/)) complexity += 1; // Numbers
    else if (char.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)) complexity += 5; // Special chars
    else complexity += 3; // Other characters
  }
  
  // Repetitive patterns are better
  const uniqueChars = new Set(text).size;
  if (uniqueChars === 1) complexity -= 5; // Single character repeated
  
  return Math.min(complexity, 25); // Cap at 25
}

// Function to get image complexity score
async function getImageComplexity(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    
    let complexity = 10; // Base complexity for images
    
    // Size complexity
    if (metadata.width > 1000 || metadata.height > 1000) complexity += 5;
    
    // Format complexity
    if (metadata.format === 'gif') complexity += 8; // Animated GIFs are complex
    else if (metadata.format === 'webp') complexity += 3;
    
    return complexity;
  } catch (error) {
    return 15; // Default high complexity if we can't analyze
  }
}

// Function to get QR code complexity
function getQRComplexity(matrix, size) {
  let complexity = 0;
  
  // Size penalty
  if (size > 25) complexity += 10;
  else if (size > 20) complexity += 5;
  
  // Pattern density
  let filledCells = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (matrix.get(row, col)) filledCells++;
    }
  }
  
  const density = filledCells / (size * size);
  if (density > 0.7) complexity += 8;  // Very dense
  else if (density < 0.3) complexity += 5; // Very sparse
  
  return complexity;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'QR Generator API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
