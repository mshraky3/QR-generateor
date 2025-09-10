# QR Code Generator

A simple web application that converts URLs into QR codes. Built with Node.js/Express backend and React frontend.

## Features

- Convert any URL to QR code
- **Custom QR code patterns** with text, emojis, and images
- Create QR codes made of custom text (love, code, X, etc.)
- Upload images to create personalized QR codes
- Choose from popular emojis (❤️, 💙, 💚, etc.)
- Download generated QR codes
- Responsive design
- Clean and modern UI
- Real-time validation
- File upload with preview

## Tech Stack

- **Backend**: Node.js, Express, QRCode library, Multer (file uploads), Sharp (image processing)
- **Frontend**: React, Vite, Axios
- **Styling**: CSS3 with responsive design

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd BACKEND
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

   For development with auto-reload:

   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd REACT
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000`

## Usage

1. Start both the backend and frontend servers
2. Open your browser and go to `http://localhost:3000`
3. Enter a URL in the input field
4. **Optional**: Check "Use custom pattern" to personalize your QR code:
   - Enter custom text (love, code, X, ABC, etc.)
   - OR choose an emoji from the grid (❤️, 💙, 💚, etc.)
   - OR upload an image file (JPG, PNG, GIF, WebP)
5. Click "Generate QR Code"
6. Download the generated QR code

### Custom QR Code Features

- **Text QR Codes**: Enter custom text (letters, words, symbols) to create QR codes where each dot is replaced with your text
- **Emoji QR Codes**: Select from popular emojis to create QR codes where each dot is replaced with the actual emoji
- **Image QR Codes**: Upload your own images to create QR codes where each dot is replaced with a small tile of your image
- **Pattern Replacement**: The QR code structure remains intact but each black dot becomes your chosen text, emoji, or image
- **File Support**: Supports JPG, PNG, GIF, and WebP formats (max 5MB)
- **Text Limit**: Custom text is limited to 10 characters for optimal QR code readability
- **Readability Validation**: Automatic testing to warn users when custom patterns may make QR codes difficult to scan

### QR Code Readability Validation

The app includes an intelligent validation system that analyzes custom patterns and warns users about potential scanning issues:

- **Emoji Analysis**: Some emojis (like 🤍 white heart) may reduce readability
- **Text Complexity**: Longer text or special characters can make QR codes harder to scan
- **Image Analysis**: Complex images or large files may impact scanning performance
- **QR Code Density**: Very dense or sparse QR patterns are flagged
- **Smart Warnings**: Users receive specific suggestions to improve readability

**Examples of patterns that may trigger warnings:**

- Very long text (over 8 characters)
- White or light-colored emojis
- Complex images with many details
- Special characters in text
- Very long URLs creating dense QR codes

## API Endpoints

- `POST /api/generate-qr` - Generate QR code from URL
- `GET /api/health` - Health check endpoint

## Project Structure

```
QR/
├── BACKEND/
│   ├── package.json
│   └── server.js
├── REACT/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       └── index.css
└── README.md
```
