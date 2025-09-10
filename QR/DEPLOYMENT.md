# Vercel Deployment Guide

## Quick Deploy to Vercel

### Option 1: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: qr-code-generator-free
# - Directory: ./
# - Override settings? N
```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `cd REACT && npm run build`
   - **Output Directory**: `REACT/dist`
5. Add Environment Variables (if needed)
6. Click "Deploy"

## Environment Variables

No environment variables required for basic functionality.

## Project Structure for Vercel

```
QR/
├── vercel.json          # Main Vercel config
├── .vercelignore        # Files to ignore
├── BACKEND/
│   ├── server.js        # API endpoints
│   └── package.json     # Backend dependencies
└── REACT/
    ├── vercel.json      # Frontend config
    ├── package.json     # Frontend dependencies
    ├── public/
    │   ├── robots.txt   # SEO
    │   └── sitemap.xml  # SEO
    └── src/             # React app
```

## Features After Deployment

- ✅ Free QR code generation
- ✅ Custom text, emoji, and image QR codes
- ✅ Readability validation
- ✅ Mobile responsive design
- ✅ SEO optimized
- ✅ No registration required
- ✅ Instant download

## Custom Domain (Optional)

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings > Domains
4. Add your custom domain
5. Update DNS records as instructed

## Monitoring

- Vercel provides built-in analytics
- Check function logs in Vercel dashboard
- Monitor API usage and performance

## Troubleshooting

- **Build fails**: Check package.json scripts
- **API not working**: Verify CORS settings
- **Images not uploading**: Check file size limits
- **SEO not working**: Verify meta tags and sitemap
