# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StoleCheck** is an AI-powered stolen goods detection & prevention platform that connects theft victims, buyers, and law enforcement through a centralized database with AI-powered verification.

**Tech Stack:**
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Recharts (Create React App with Craco)
- **Backend**: Python FastAPI with Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI**: Google Gemini 3 Flash for image analysis & comparison
- **Auth**: JWT + Google OAuth (via Emergent integration)

## Quick Start

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Set up .env file with: MONGO_URL, DB_NAME, JWT_SECRET, GEMINI_API_KEY
python -m uvicorn server:app --reload
```

### Frontend Setup
```bash
cd frontend
yarn install
yarn start  # Runs on http://localhost:3000
```

### Running Tests
```bash
# Backend tests
python backend_test.py

# Frontend tests
cd frontend && yarn test
```

## Architecture

### Backend (`/backend`)
- **server.py** - FastAPI app with 20+ REST endpoints (auth, items, verification, cases, alerts, admin)
- **auth.py** - JWT token generation, password hashing, session management
- **models.py** - Pydantic models for validation (Users, Items, Verification, Cases, etc.)
- **ai_service.py** - Gemini integration for image analysis and TPS (Theft Prevention Score) calculation
- **seed_data.py** - Demo data seeding for testing

**Key Features:**
- Role-based access (victim, buyer, law_enforcement, admin)
- Stolen item CRUD with auto-generated SCID (Stolen Commodity ID)
- Buyer verification with TPS scoring: Visual (40%), ID Match (35%), Metadata (15%), Context (10%)
- Exact ID match override (IMEI/VIN) triggers TPS ≥ 88
- Real-time alerts and case management
- Admin analytics and user management

### Frontend (`/frontend`)
- **src/pages** - Route pages: Auth, Victim Dashboard, Buyer Verification, Law Enforcement, Admin Panel
- **src/components** - Reusable UI components (Layout, TPSDisplay, forms, charts)
- **src/context/AuthContext.js** - Global auth state management
- **src/lib/api.js** - Axios instance for backend communication
- **src/components/ui** - Radix UI component wrappers

**Key Routes:**
- `/auth` - Login/Register with Google OAuth
- `/victim` - Register/track stolen items
- `/buyer` - Verify items via photo, ID scan, or text search
- `/law-enforcement` - Monitor alerts, manage cases
- `/admin` - Analytics, user management, activity feed

## Demo Credentials
- Admin: `admin@stolecheck.in` / `admin123`
- Victim: `priya@example.com` / `pass123`
- Buyer: `ravi@example.com` / `pass123`
- Law Enforcement: `inspector@police.gov.in` / `pass123`

## Common Development Tasks

### Adding a New API Endpoint
1. Define Pydantic model in `backend/models.py`
2. Add route to `backend/server.py` with proper auth decorator (`@get_current_user`)
3. Test using `backend_test.py`

### Modifying TPS Calculation
Edit `ai_service.py:calculate_tps()` - weights: Visual 40%, ID 35%, Metadata 15%, Context 10%

### Adding Frontend Pages
1. Create component in `src/pages/`
2. Add route to `src/App.js` with role-based access
3. Use AuthContext for user/role access

### Styling
Frontend uses Tailwind CSS with dark tactical theme. Config in `frontend/tailwind.config.js`. UI components in `src/components/ui/` are pre-styled Radix UI wrappers.

## Important Notes

- **MongoDB Connection**: Uses Motor async driver; all DB operations must be `async`
- **Image Handling**: Currently stored as base64 in MongoDB (consider cloud storage for production)
- **CORS**: Configured in backend for frontend dev server
- **Environment Variables**: Backend requires `.env` file (MONGO_URL, DB_NAME, JWT_SECRET, GEMINI_API_KEY)
- **Testing**: `backend_test.py` expects backend running at `https://doc-deploy-5.preview.emergentagent.com`

## Directory Structure
```
stolecheck/
├── backend/              # FastAPI application
│   ├── server.py        # Main API routes
│   ├── auth.py          # Authentication logic
│   ├── models.py        # Pydantic models
│   ├── ai_service.py    # Gemini AI integration
│   ├── seed_data.py     # Demo data
│   └── requirements.txt
├── frontend/            # React application
│   ├── src/
│   │   ├── pages/       # Route components
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # State management
│   │   ├── lib/         # Utilities (API client, helpers)
│   │   └── hooks/       # Custom React hooks
│   ├── public/
│   ├── tailwind.config.js
│   ├── craco.config.js  # Create React App config override
│   └── package.json
├── tests/               # Frontend test utilities
├── test_reports/        # Test results
├── backend_test.py      # Backend integration tests
├── memory/PRD.md        # Product requirements
└── design_guidelines.json
```
