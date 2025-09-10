#!/bin/bash

echo "🔄 Starting Cryptocurrency Exchange Application..."
echo "=================================================="

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "python.*server.py" || true
pkill -f "vite" || true
sleep 2

# Set environment variables for proper database connection
export DATABASE_URL="${DATABASE_URL}"
export PORT="5000"
export SECRET_KEY="replit-crypto-exchange-secret"
export DEBUG="True"

# Start Python backend server on port 5875
echo "🐍 Starting Python backend server on port 5875..."
cd server
python3 server.py > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ..

# Give backend time to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server started successfully"
else
    echo "❌ Backend server failed to start. Check backend.log"
    cat backend.log
    exit 1
fi

# Start frontend server with fixed configuration (bypass cartographer)
echo "⚛️  Starting React frontend on port 5000..."
REPL_ID="" NODE_ENV=development npx vite --host 0.0.0.0 --port 5000 --clearScreen false > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Give frontend time to start
echo "⏳ Waiting for frontend to initialize..."
sleep 5

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ Frontend server started successfully"
    echo ""
    echo "🎉 APPLICATION READY!"
    echo "Frontend: http://0.0.0.0:5000"
    echo "Backend:  http://0.0.0.0:5875"
    echo ""
    echo "📋 Process IDs:"
    echo "Backend:  $BACKEND_PID"
    echo "Frontend: $FRONTEND_PID"
    echo ""
    echo "📝 Log files:"
    echo "Backend:  backend.log"
    echo "Frontend: frontend.log"
    echo ""
    echo "To stop: pkill -f 'python.*server.py'; pkill -f vite"
    
    # Keep script running to maintain processes
    wait
else
    echo "❌ Frontend server failed to start. Check frontend.log"
    cat frontend.log
    pkill -p $BACKEND_PID
    exit 1
fi