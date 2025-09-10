@echo off
echo 🚀 Building QR Code Generator for Production...

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist "REACT\dist" rmdir /s /q "REACT\dist"
if exist "REACT\node_modules\.vite" rmdir /s /q "REACT\node_modules\.vite"

REM Install dependencies
echo 📦 Installing dependencies...
cd REACT
call npm install --production=false
cd ..\BACKEND
call npm install --production=false
cd ..

REM Build frontend
echo 🔨 Building frontend...
cd REACT
call npm run build
cd ..

echo ✅ Build completed successfully!
echo 📁 Frontend build: REACT\dist
echo 🌐 Ready for Vercel deployment!
pause
