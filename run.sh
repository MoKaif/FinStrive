#!/bin/bash

# FinStrive Unified Runner
# This script starts both the .NET Backend and the React Frontend.

# ANSI color codes for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Starting FinStrive Environment...    ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Function to kill background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    # Kill background jobs
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start .NET API
echo -e "${GREEN}[Backend] Starting .NET API...${NC}"
dotnet run --project api/api.csproj --launch-profile http &
BACKEND_PID=$!

# Wait a bit for backend to initialize
echo -e "${YELLOW}[System] Waiting for backend to initialize...${NC}"
sleep 5

# Start React Frontend
echo -e "${GREEN}[Frontend] Starting React App...${NC}"
# We use --prefix to run from root without cd
npm start --prefix frontend &
FRONTEND_PID=$!

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  FinStrive is now running!           ${NC}"
echo -e "${BLUE}  - Backend:  http://localhost:5101    ${NC}"
echo -e "${BLUE}  - Frontend: http://localhost:3000    ${NC}"
echo -e "${BLUE}  Press Ctrl+C to stop all services.   ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
