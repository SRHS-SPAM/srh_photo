# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/front

# Copy frontend package files
COPY front/package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy frontend source
COPY front/ ./

# Build React app
RUN npm run build

# Stage 2: Setup Django backend
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY back/photo/ ./back/photo/

# Copy React build from frontend-builder stage
COPY --from=frontend-builder /app/front/build /app/front/build
COPY --from=frontend-builder /app/front/public /app/front/public

# Set working directory to Django project
WORKDIR /app/back/photo

# Collect static files
RUN python manage.py collectstatic --noinput

# Create media directory
RUN mkdir -p media/photos media/qr_codes

# Expose port (Cloud Run uses PORT environment variable)
ENV PORT=8080
EXPOSE 8080

# Run gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 photo.wsgi:application
