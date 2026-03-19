# StoleCheck - AI-Powered Stolen Goods Detection Platform

## Original Problem Statement
Build StoleCheck - an AI-powered stolen goods detection & prevention platform as per the DPR document. The platform connects theft victims, buyers, and law enforcement through a centralized stolen goods database with AI-powered verification.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Recharts
- **Backend**: Python FastAPI 
- **Database**: MongoDB (Motor async driver)
- **AI**: Gemini 3 Flash (via Emergent LLM key) for image analysis & comparison
- **Auth**: JWT + Emergent Google OAuth

## User Personas
1. **Theft Victims** - Register stolen items, track recovery status
2. **Second-hand Buyers/Dealers** - Verify items before purchase
3. **Law Enforcement** - Monitor alerts, manage cases, view intelligence
4. **Platform Admins** - User management, analytics, data governance

## Core Requirements
- Victim Portal: Register stolen items with photos, descriptions, unique IDs (IMEI, VIN, hallmark)
- Buyer Verification: Photo scan, ID lookup, text search with TPS scoring (0-100)
- Law Enforcement Dashboard: Real-time alerts, case management, statistics
- Admin Panel: User management, analytics charts, activity feed
- Authentication: JWT + Google OAuth
- Seed demo data for testing

## What's Been Implemented (Jan 19, 2026)

### Backend (FastAPI)
- Full REST API with 20+ endpoints
- JWT + Google OAuth authentication
- Stolen item CRUD with SCID generation
- AI-powered image analysis via Gemini 3 Flash
- Buyer verification with TPS scoring (Visual 40%, ID 35%, Metadata 15%, Context 10%)
- Exact ID match override (IMEI/VIN → TPS ≥ 88)
- Law enforcement alerts & case management
- Admin analytics & user role management
- Seed data: 7 users, 8 items, 4 alerts, 2 cases across 4 roles

### Frontend (React)
- Landing page with live stats, feature cards, CTA
- Auth page with sign-in/register tabs + Google OAuth
- Victim Dashboard: item listing, creation form, filters, status updates
- Buyer Verification: Photo scan (AI), ID scan, Text search, TPS display
- Law Enforcement: Command center with alerts, cases, overview stats
- Admin Panel: Analytics charts (Recharts), user management, activity feed
- Dark "Tactical Command Center" theme with Chivo/Manrope/JetBrains Mono fonts
- Role-based routing and sidebar navigation

### Testing Results
- Backend: 95.2% pass rate
- Frontend: 90% pass rate
- Overall: 90% pass rate

## Demo Credentials
- Admin: admin@stolecheck.in / admin123
- Victim: priya@example.com / pass123
- Buyer: ravi@example.com / pass123
- Law Enforcement: inspector@police.gov.in / pass123

## Prioritized Backlog

### P0 (Critical)
- [x] All four modules implemented
- [x] TPS scoring with exact ID match override
- [x] Role-based access control

### P1 (Important)
- [ ] Notification system (SMS/push when item matched)
- [ ] Image storage optimization (currently base64 in MongoDB)
- [ ] Map integration for alerts/incident visualization
- [ ] Bulk upload for law enforcement

### P2 (Nice to have)
- [ ] Mobile-responsive fine-tuning
- [ ] Export reports (PDF/CSV)
- [ ] Multi-language support (Hindi, Telugu, Tamil)
- [ ] Dark/light theme toggle
- [ ] CCTNS API integration exploration

## Next Tasks
1. Add notification system for victim alerts
2. Integrate map view for law enforcement (CartoDB Dark Matter)
3. Add image storage to cloud (currently base64 in DB)
4. Implement bulk upload for police stations
5. Add detailed item comparison view
