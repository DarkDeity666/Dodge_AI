#!/bin/bash
# start.sh — starts both backend and frontend

echo "🚀 Starting O2C Graph Explorer"
echo ""

# Check node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

# Check .env
if [ ! -f backend/.env ]; then
  echo "⚠️  No backend/.env found. Creating from example..."
  cp backend/.env.example backend/.env
  echo ""
  echo "⚠️  IMPORTANT: Edit backend/.env and add your ANTHROPIC_API_KEY"
  echo "   Get a free key at: https://console.anthropic.com"
  echo ""
fi

# Install deps
echo "📦 Installing backend dependencies..."
cd backend && npm install --silent
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install --silent
cd ..

echo ""
echo "✅ Starting servers..."
echo "   Backend  → http://localhost:3001"
echo "   Frontend → http://localhost:3000"
echo ""

# Start backend in background
cd backend && npm start &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Start frontend
cd ../frontend && npm start

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
