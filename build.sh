#!/bin/bash

# Script to build and prepare the SalesLens API
echo "🚀 Building SalesLens API..."

# Ensure proper environment
if [ ! -f ".env" ]; then
  echo "⚠️ .env file not found. Creating from example..."
  cat > .env << EOL
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/saleslens
SESSION_SECRET=saleslens_dev_session_secret
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
EOL
  echo "✅ .env file created. Please update with your own settings."
fi

# Create upload directories if they don't exist
echo "📁 Creating upload directories..."
mkdir -p uploads/knowledge uploads/customers uploads/transcripts

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript files
echo "🏗️ Building TypeScript code..."
npm run build

# Verify build
if [ -d "./dist" ]; then
  echo "✅ Build completed successfully!"
  echo "👉 You can now start the API with: npm start"
else
  echo "❌ Build failed. Please check for errors above."
  exit 1
fi

# Done
echo "✨ Setup completed!"
