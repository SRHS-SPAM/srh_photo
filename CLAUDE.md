# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a photo booth application with a React frontend and Django backend. The app allows users to take photos through their webcam, apply frames, generate QR codes for download, and optionally print photos with embedded QR codes.

**Tech Stack:**
- Frontend: React 18 with Create React App
- Backend: Django 4.2 + Django REST Framework
- Database: SQLite (development)
- Deployment: Heroku/Render with Gunicorn + WhiteNoise

## Architecture

### Frontend Structure (`/front`)

React SPA with screen-based navigation managed by state in `App.js`:

- **Screen Flow**: `StartScreen` → `TutorialScreen` → `ChooseScreen` → `WebcamCapture`/`IdolCam` → `PhotoFrameTest` (result)
- **Key Components**:
  - `WebcamCapture.js`: Standard 4-photo capture using react-webcam
  - `IdolCam.js`: Park frame variant with different capture logic
  - `PhotoFrameTest.js`: Final result display with download/print functionality
  - `DownloadButton.js`: Handles image compositing with html2canvas and upload to backend

### Backend Structure (`/back/photo`)

Django project serving both the React SPA and REST API:

- **Django App**: `catalog` - handles photo management
- **Models** (`catalog/models.py`):
  - `Photo`: Stores uploaded images, auto-generates QR codes linking to download URLs
  - Uses UUID for primary keys
  - QR code generation happens in `save()` method
  - Windows-specific printing via `win32print`/`win32api`
- **API Endpoints** (`catalog/urls.py` and `photo/urls.py`):
  - `POST /api/photos/` - Upload photo (via PhotoViewSet)
  - `GET /api/photos/` - List all photos
  - `GET /api/photos/<uuid>/download/` - Download specific photo
  - `GET /api/current-date/` - Get current date
- **Static Files**: React build served via WhiteNoise, configured to handle `/static/` and media files

### Integration Points

1. **React Build Integration**: Django serves React's production build from `/front/build`
   - `STATICFILES_DIRS` includes React build/static directory
   - All non-API routes fall through to React's `index.html` (SPA routing)

2. **CORS Configuration**: Backend allows `localhost:3000` (development) and production domains

3. **Photo Upload Flow**:
   - Frontend: User captures 4 photos → html2canvas composites them into single image → uploads via `fetch` to `/api/photos/`
   - Backend: Receives image → saves Photo model → auto-generates QR code → (optional) prints with embedded QR

## Development Commands

### Frontend Development
```bash
cd front
npm start                    # Start dev server on localhost:3000
npm run build                # Create production build
npm test                     # Run tests
```

### Backend Development
```bash
cd back/photo
python manage.py runserver   # Start Django dev server on localhost:8000
python manage.py migrate     # Apply database migrations
python manage.py makemigrations catalog  # Create new migrations
python manage.py collectstatic --noinput # Collect static files for production
python manage.py createsuperuser         # Create admin user
```

### Full Stack Development
Run both servers simultaneously:
- Frontend: `npm start` in `/front` (port 3000)
- Backend: `python manage.py runserver` in `/back/photo` (port 8000)

### Production Deployment

**Cloud Run (Recommended)**:
See `DEPLOY.md` for detailed Cloud Run deployment instructions.

Quick deploy:
```bash
# Build and push to Artifact Registry
docker build -t asia-northeast3-docker.pkg.dev/spam/srh-photo/app:latest .
docker push asia-northeast3-docker.pkg.dev/spam/srh-photo/app:latest

# Deploy to Cloud Run
gcloud run deploy srh-photo \
    --image asia-northeast3-docker.pkg.dev/spam/srh-photo/app:latest \
    --region asia-northeast3 \
    --allow-unauthenticated
```

**Legacy (Heroku/Render)**:
The Procfile uses Gunicorn:
```bash
cd back/photo && python manage.py collectstatic --noinput
gunicorn --chdir back/photo photo.wsgi
```

**GitHub Actions Auto-Deploy**:
Pushing to `main` branch or merging PRs automatically triggers deployment to Cloud Run via `.github/workflows/deploy-cloud-run.yml`

## Important Notes

### QR Code Generation
- QR codes are automatically generated when a Photo model is saved
- QR URL format: `https://srh-photo.onrender.com/api/photos/{uuid}/download/`
- The QR code is embedded in bottom-right corner of the photo (100x100px)

### Windows Printing Feature
- `models.py` includes Windows-specific printer integration via `win32print`/`win32api`
- This will fail on non-Windows platforms but is wrapped in try/except
- When deploying to Linux servers (Heroku/Render), the print functionality is skipped

### Static Files Configuration
- `STATIC_ROOT`: `/back/photo/staticfiles`
- `MEDIA_ROOT`: `/back/photo/media`
- React build files are served from `STATICFILES_DIRS`
- WhiteNoise handles static file serving in production

### Database
- Development uses SQLite (`db.sqlite3`)
- Photo model uses UUIDs as primary keys for QR code URL generation
- ImageField uploads go to `media/photos/` and `media/qr_codes/`

## Common Issues

### CORS Errors
Check that frontend URL is in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in `back/photo/photo/settings.py`

### Static Files Not Loading
Run `python manage.py collectstatic` and verify `STATICFILES_DIRS` includes React build directory

### Photo Upload Failures
- Ensure `MEDIA_ROOT` directory exists and is writable
- Check that request includes proper `multipart/form-data` content type
- Verify `MultiPartParser` is configured in DRF settings
