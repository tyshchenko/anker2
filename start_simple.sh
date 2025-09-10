#!/bin/bash

echo "🔄 Starting Simple Cryptocurrency Exchange Application..."
echo "======================================================"

# Kill any existing processes
pkill -f "python.*server.py" || true
pkill -f "vite" || true
pkill -f "node.*dev" || true
sleep 2

# Set essential environment variables
export DATABASE_URL="${DATABASE_URL}"
export SECRET_KEY="replit-crypto-exchange-secret"

# Start Python backend server
echo "🐍 Starting Python backend server on port 5875..."
cd server
python3 server.py > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 5

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server started successfully on port 5875"
else
    echo "❌ Backend server failed to start"
    cat backend.log | tail -20
    exit 1
fi

# Start frontend with cartographer completely disabled
echo "⚛️  Starting React frontend on port 5000..."
cd client
REPL_ID="" npm run build > ../frontend_build.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
    REPL_ID="" NODE_ENV=development npx vite --host 0.0.0.0 --port 5000 > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    sleep 5
    
    if ps -p $FRONTEND_PID > /dev/null; then
        echo "✅ Frontend started successfully on port 5000"
        echo ""
        echo "🎉 APPLICATION READY!"
        echo "Frontend: http://0.0.0.0:5000"
        echo "Backend:  http://0.0.0.0:5875"
        echo ""
        echo "Backend PID: $BACKEND_PID"
        echo "Frontend PID: $FRONTEND_PID"
        wait
    else
        echo "❌ Frontend failed to start"
        cat frontend.log | tail -20
        pkill -p $BACKEND_PID
        exit 1
    fi
else
    echo "❌ Frontend build failed"
    cat frontend_build.log | tail -20
    pkill -p $BACKEND_PID
    exit 1
fi