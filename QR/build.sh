#!/bin/bash

echo "🚀 Building QR Code Generator for Production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf REACT/dist
rm -rf REACT/node_modules/.vite

# Install dependencies
echo "📦 Installing dependencies..."
cd REACT && npm install --production=false
cd ../BACKEND && npm install --production=false
cd ..

# Build frontend
echo "🔨 Building frontend..."
cd REACT && npm run build
cd ..

echo "✅ Build completed successfully!"
echo "📁 Frontend build: REACT/dist"
echo "🌐 Ready for Vercel deployment!"
