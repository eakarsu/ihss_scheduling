#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║    📍 IHSS Scheduling Platform                   ║"
echo "║    Territory-Based Workforce Scheduling           ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Clean used ports ----
echo -e "${YELLOW}[1/6] Cleaning used ports (4000, 4001)...${NC}"
for PORT in 4000 4001; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo -e "  ${RED}Killing process on port $PORT (PID: $PID)${NC}"
    kill -9 $PID 2>/dev/null || true
    sleep 1
  else
    echo -e "  ${GREEN}Port $PORT is free${NC}"
  fi
done

# ---- Check PostgreSQL ----
echo -e "${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if command -v pg_isready &>/dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "  ${GREEN}PostgreSQL is running${NC}"
  else
    echo -e "  ${YELLOW}Starting PostgreSQL...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    else
      sudo service postgresql start 2>/dev/null || true
    fi
    sleep 2
  fi
else
  echo -e "  ${YELLOW}pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ---- Create database ----
echo -e "${YELLOW}[3/6] Setting up database...${NC}"
source "$SCRIPT_DIR/.env" 2>/dev/null || true
DB_NAME="${DB_NAME:-ihss_scheduling}"
createdb "$DB_NAME" 2>/dev/null && echo -e "  ${GREEN}Database '$DB_NAME' created${NC}" || echo -e "  ${GREEN}Database '$DB_NAME' already exists${NC}"

# ---- Install dependencies ----
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"
if [ ! -d "backend/node_modules" ]; then
  echo -e "  ${BLUE}Installing backend dependencies...${NC}"
  cd backend && npm install && cd ..
else
  echo -e "  ${GREEN}Backend dependencies already installed${NC}"
fi

if [ ! -d "frontend/node_modules" ]; then
  echo -e "  ${BLUE}Installing frontend dependencies...${NC}"
  cd frontend && npm install && cd ..
else
  echo -e "  ${GREEN}Frontend dependencies already installed${NC}"
fi

# ---- Seed database ----
echo -e "${YELLOW}[5/6] Seeding database...${NC}"
cd backend && node seed.js && cd ..
echo -e "  ${GREEN}Database seeded successfully${NC}"

# ---- Start application ----
echo -e "${YELLOW}[6/6] Starting application with hot reload...${NC}"
echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║  Backend:  http://localhost:4001                 ║${NC}"
echo -e "${PURPLE}║  Frontend: http://localhost:4000                 ║${NC}"
echo -e "${PURPLE}║                                                  ║${NC}"
echo -e "${PURPLE}║  Login: admin@ihss.com / password123             ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"
echo ""

cleanup() {
  echo ""
  echo -e "${RED}Shutting down...${NC}"
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

cd "$SCRIPT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!

cd "$SCRIPT_DIR/frontend"
BROWSER=none PORT=4000 npm start &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
