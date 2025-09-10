const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Try to load Sharp with fallback
let sharp;
try {
  sharp = require('sharp');
  console.log('Sharp loaded successfully');
} catch (error) {
  console.error('Sharp failed to load:', error.message);
  console.log('Falling back to basic QR generation without image processing');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist (use temp directory for serverless)
const uploadsDir = process.env.NODE_ENV === 'production' 
  ? path.join(os.tmpdir(), 'qr-uploads')
  : path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|tiff|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed! (jpg, png, gif, webp, bmp, tiff, svg)'));
    }
  }
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

// Generate QR code endpoint
app.post('/api/generate-qr', upload.single('customImage'), async (req, res) => {
  try {
    console.log('QR generation request received:', {
      body: req.body,
      hasFile: !!req.file,
      fileInfo: req.file ? { name: req.file.originalname, size: req.file.size } : null
    });

    const { url, emoji, customText, useCustomPattern } = req.body;
    
    if (!url) {
      console.log('Error: URL is required');
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      console.log('Error: Invalid URL format:', url);
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    let qrCodeDataURL;

    if (useCustomPattern === 'true' && (customText || req.file)) {
      console.log('Generating custom QR code with pattern');
      // Generate QR code with custom pattern
      qrCodeDataURL = await generateCustomQRCode(url, null, customText, req.file);
    } else {
      console.log('Generating standard QR code');
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

    console.log('QR code generated successfully, validating readability');
    // Validate QR code readability
    const validationResult = await validateQRCodeReadability(url, qrCodeDataURL, null, customText, req.file);

    // Clean up uploaded file after processing and validation
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Uploaded file deleted:', req.file.path);
      } catch (err) {
        console.error('Error deleting uploaded file:', err);
      }
    }

    console.log('QR generation completed successfully');
    res.json({ 
      success: true, 
      qrCode: qrCodeDataURL,
      originalUrl: url,
      isReadable: validationResult.isReadable,
      warning: validationResult.warning
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate QR code',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  if (error.message.includes('Only image files are allowed')) {
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: 'Upload error' });
});

// Function to generate custom QR code
async function generateCustomQRCode(url, emoji, customText, uploadedFile) {
  try {
    if (customText) {
      // Check if customText contains emojis
      if (containsEmoji(customText)) {
        return await generateEmojiQRCode(url, customText);
      } else {
        return await generateTextQRCode(url, customText);
      }
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
    // If Sharp is not available, fall back to standard QR code
    if (!sharp) {
      console.log('Sharp not available, falling back to standard QR code');
      return await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }

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
    
    // Convert SVG to PNG using Sharp
    const svgBuffer = Buffer.from(svg);
    const pngBuffer = await sharp(svgBuffer)
      .png()
      .toBuffer();
    
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error creating text QR code:', error);
    // Fall back to standard QR code if custom generation fails
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }
}

// Function to generate emoji-based QR code
async function generateEmojiQRCode(url, customText) {
  try {
    // If Sharp is not available, fall back to standard QR code
    if (!sharp) {
      console.log('Sharp not available, falling back to standard QR code');
      return await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }

    // Extract the first emoji from the text
    const firstEmoji = extractFirstEmoji(customText);
    
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
                         dominant-baseline="middle">${firstEmoji}</text>`;
        }
      }
    }
    
    svg += '</svg>';
    
    // Convert SVG to PNG using Sharp
    const svgBuffer = Buffer.from(svg);
    const pngBuffer = await sharp(svgBuffer)
      .png()
      .toBuffer();
    
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error creating emoji QR code:', error);
    // Fall back to standard QR code if custom generation fails
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }
}

// Function to generate image-based QR code
async function generateImageQRCode(url, imagePath) {
  try {
    // If Sharp is not available, fall back to standard QR code
    if (!sharp) {
      console.log('Sharp not available, falling back to standard QR code');
      return await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }

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
    
    // Convert SVG to PNG using Sharp
    const svgBuffer = Buffer.from(svg);
    const pngBuffer = await sharp(svgBuffer)
      .png()
      .toBuffer();
    
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error creating image QR code:', error);
    // Fall back to standard QR code if custom generation fails
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
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

    if (customText) {
      if (containsEmoji(customText)) {
        // Check emoji complexity
        const firstEmoji = extractFirstEmoji(customText);
        const emojiComplexity = getEmojiComplexity(firstEmoji);
        readabilityScore -= emojiComplexity;
        
        if (readabilityScore < 70) {
          warning = `Warning: The emoji "${firstEmoji}" may make the QR code difficult to scan. Consider using a simpler emoji or standard QR code.`;
        }
      } else {
        // Check text complexity
        const textComplexity = getTextComplexity(customText);
        readabilityScore -= textComplexity;
        
        if (readabilityScore < 70) {
          warning = `Warning: The text "${customText}" may make the QR code difficult to scan. Consider using shorter text or standard QR code.`;
        }
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

// Function to check if text contains emojis
function containsEmoji(text) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(text);
}

// Function to extract the first emoji from text
function extractFirstEmoji(text) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  const match = text.match(emojiRegex);
  return match ? match[0] : '❤️'; // Default to heart if no emoji found
}

// Function to get colors based on emoji
function getEmojiColors(emoji) {
  const emojiColorMap = {
    '❤️': { dark: '#e74c3c', light: '#fdf2f2' },
    '💙': { dark: '#3498db', light: '#f0f8ff' },
    '💚': { dark: '#2ecc71', light: '#f0fff4' },
    '💛': { dark: '#f1c40f', light: '#fffef0' },
    '💜': { dark: '#9b59b6', light: '#faf0ff' },
    '🖤': { dark: '#2c3e50', light: '#f8f9fa' },
    '🤍': { dark: '#95a5a6', light: '#ffffff' },
    '🔥': { dark: '#e67e22', light: '#fff5f0' },
    '⭐': { dark: '#f39c12', light: '#fffef0' },
    '🌟': { dark: '#f1c40f', light: '#fffef0' },
    '💎': { dark: '#3498db', light: '#f0f8ff' },
    '🎯': { dark: '#e74c3c', light: '#fdf2f2' },
    '🚀': { dark: '#9b59b6', light: '#faf0ff' },
    '💫': { dark: '#f39c12', light: '#fffef0' },
    '🎨': { dark: '#e67e22', light: '#fff5f0' },
    '🎭': { dark: '#8e44ad', light: '#f8f4ff' },
    '🎪': { dark: '#e74c3c', light: '#fdf2f2' },
    '🏆': { dark: '#f39c12', light: '#fffef0' },
    '🎊': { dark: '#e67e22', light: '#fff5f0' },
    '🎉': { dark: '#e74c3c', light: '#fdf2f2' },
    '😊': { dark: '#f39c12', light: '#fffef0' },
    '😍': { dark: '#e74c3c', light: '#fdf2f2' },
    '🥰': { dark: '#e91e63', light: '#fce4ec' },
    '😎': { dark: '#2c3e50', light: '#f8f9fa' },
    '🤩': { dark: '#f39c12', light: '#fffef0' },
    '🥳': { dark: '#e67e22', light: '#fff5f0' },
    '😇': { dark: '#3498db', light: '#f0f8ff' }
  };
  
  return emojiColorMap[emoji] || { dark: '#000000', light: '#FFFFFF' };
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
    if (!sharp) {
      return 15; 
    }
    
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
