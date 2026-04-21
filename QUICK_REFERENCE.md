# StoleCheck Quick Reference Guide

## Common Development Tasks

### Set Up Local Development

```bash
# Clone repository
git clone https://github.com/kommi/stolecheck.git
cd stolecheck

# Backend setup
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Gemini API key and other configs
python -m uvicorn server:app --reload

# Frontend setup (in new terminal)
cd frontend
yarn install
yarn start
```

### Environment Variables (Backend)

```bash
# Gemini AI
GEMINI_API_KEY=AIzaSy...

# Google Cloud
GCP_PROJECT_ID=stolecheck-prod
GCS_BUCKET_NAME=stolecheck-images-prod

# Authentication
JWT_SECRET=your-secret-key
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX...

# MongoDB (if still using)
MONGO_URL=mongodb+srv://user:pass@cluster
DB_NAME=stolecheck

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

## API Endpoints

### Authentication
```
POST   /api/auth/register          # Register with email/password
POST   /api/auth/login             # Login with email/password
POST   /api/auth/google-callback   # Google OAuth callback
GET    /api/auth/me                # Get current user
POST   /api/auth/logout            # Logout
```

### Stolen Items
```
POST   /api/items                  # Create item with image
GET    /api/items                  # List all items
GET    /api/items/{id}             # Get specific item
PUT    /api/items/{id}             # Update item
POST   /api/items/{id}/upload-image # Upload additional image
```

### Buyer Verification
```
POST   /api/verify                 # Verify item (photo, ID, text search)
GET    /api/verifications/{id}     # Get verification result
GET    /api/verifications          # List user's verifications
```

### Admin
```
GET    /api/admin/stats            # Get platform statistics
GET    /api/admin/users            # List all users
GET    /api/admin/alerts           # Recent alerts
GET    /api/admin/activity         # Activity log
```

## AI Service Usage

### Analyze Item Image
```python
from ai_service import analyze_item_image

result = await analyze_item_image(
    image_base64="data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    context="Category: electronics, Title: Laptop"
)
# Returns: {
#   "category": "electronics",
#   "brand": "Dell",
#   "model": "XPS 13",
#   "color": "silver",
#   "key_features": [...],
#   "visible_identifiers": "Serial: ABC123"
# }
```

### Compare Images
```python
from ai_service import compare_images_real

result = await compare_images_real(
    scan_image_base64="...",
    stored_items=[{...}, {...}]
)
# Returns: {
#   "visual_similarity": 0.85,
#   "matched_items": [{...}, {...}],
#   "ai_analysis": "Strong match with item SC-12345"
# }
```

### Calculate TPS Score
```python
from ai_service import calculate_tps

result = calculate_tps(
    visual_sim=0.90,          # Visual similarity (0-1)
    id_confidence=0.0,        # ID match (0-1, 1.0 = exact match)
    metadata_match=0.60,      # Metadata match (0-1)
    contextual_risk=0.40      # Contextual risk (0-1)
)
# Returns: {
#   "tps_score": 78,
#   "risk_level": "suspicious",
#   "visual_similarity": 0.9,
#   "id_match_confidence": 0.0,
#   "metadata_match": 0.6,
#   "contextual_risk": 0.4
# }
```

## Cloud Storage Operations

### Upload Image
```python
from gcp_storage import CloudStorageClient

storage = CloudStorageClient(bucket_name="stolecheck-images-prod")

bucket_path = await storage.upload_image(
    file_path="users/user_123/item_456/image.jpg",
    file_bytes=image_bytes,
    content_type="image/jpeg"
)
# Returns: gs://stolecheck-images-prod/users/user_123/item_456/image.jpg
```

### Generate Signed URL
```python
signed_url = await storage.generate_signed_url(
    file_path="users/user_123/item_456/image.jpg",
    expiry_hours=24
)
# Returns: https://storage.googleapis.com/stolecheck-images-prod/...?X-Goog-Signature=...
```

## Database Operations

### With Firestore Client
```python
from firestore_client import FirestoreDB

db = FirestoreDB(project_id="stolecheck-prod")

# Create stolen item
item = await db.create_stolen_item("item_123", {
    "user_id": "user_456",
    "title": "Stolen Laptop",
    "category": "electronics",
    "description": "Dell XPS 13, serial ABC123",
    "images": [{
        "bucket_path": "gs://...",
        "uploaded_at": "2026-04-20T...",
        "size_bytes": 12345
    }],
    "status": "active"
})

# Get item
item = await db.get_stolen_item("item_123")

# Find by user
items = await db.get_stolen_items_by_user("user_456")

# Update
await db.update_stolen_item("item_123", {"status": "recovered"})
```

## Authentication Flow

### Google OAuth 2.0
```
User → Click "Sign in with Google"
     ↓
Frontend redirects to Google OAuth
     ↓
User approves permissions
     ↓
Google returns auth code to frontend
     ↓
Frontend sends auth code to backend
     ↓
Backend: POST /api/auth/google-callback with id_token
     ↓
Backend verifies token, creates user session
     ↓
Frontend stores JWT token, sets session cookie
     ↓
User is authenticated ✓
```

### Local Auth
```
User → Email & Password
     ↓
Backend: POST /api/auth/register or /api/auth/login
     ↓
Backend hashes password with bcrypt
     ↓
Backend creates JWT token
     ↓
Frontend stores JWT token
     ↓
User is authenticated ✓
```

## Testing

### Unit Test Template
```python
import pytest
from ai_service import analyze_item_image

@pytest.mark.asyncio
async def test_analyze_item_image():
    result = await analyze_item_image(
        image_base64="test_image_b64",
        context="test item"
    )
    assert "category" in result
    assert "key_features" in result
```

### Integration Test Template
```python
import asyncio
from firestore_client import FirestoreDB
from gcp_storage import CloudStorageClient

async def test_image_workflow():
    storage = CloudStorageClient()
    db = FirestoreDB()
    
    # Upload image
    bucket_path = await storage.upload_image(...)
    
    # Create item with image
    item = await db.create_stolen_item("item_123", {
        "images": [{"bucket_path": bucket_path}]
    })
    
    assert item["item_id"] == "item_123"
```

## Deployment Quick Commands

### Build Docker Image
```bash
docker build -t gcr.io/stolecheck-prod/stolecheck-backend:latest .
docker push gcr.io/stolecheck-prod/stolecheck-backend:latest
```

### Deploy to Cloud Run
```bash
gcloud run deploy stolecheck-backend \
  --image gcr.io/stolecheck-prod/stolecheck-backend:latest \
  --region us-central1 \
  --allow-unauthenticated
```

### View Logs
```bash
gcloud run logs read stolecheck-backend --limit 50
```

### Update Environment Variable
```bash
gcloud run services update stolecheck-backend \
  --update-env-vars KEY=value \
  --region us-central1
```

## Troubleshooting

### Gemini API Not Working
```python
# Check API key is set
import os
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("GEMINI_API_KEY not set")

# Test API connection
import google.generativeai as genai
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash")
response = model.generate_content("test")
print(response.text)
```

### Firestore Connection Error
```python
from google.cloud import firestore
db = firestore.Client(project="stolecheck-prod")
# If this fails, check:
# 1. GCP_PROJECT_ID env var
# 2. GOOGLE_APPLICATION_CREDENTIALS
# 3. Service account has Firestore permissions
```

### Image Upload Failed
```python
# Check bucket exists
gsutil ls -b gs://stolecheck-images-prod

# Check permissions
gsutil iam ch serviceAccount:sa@project.iam.gserviceaccount.com:objectCreator \
  gs://stolecheck-images-prod

# Check bucket policies
gsutil bucketpolicyonly get gs://stolecheck-images-prod
```

## Architecture Diagram

```
┌─────────────────┐
│  Frontend       │ (React 19)
│  (localhost:3   │
│   000)          │
└────────┬────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
  ┌─────────────────┐        ┌──────────────────┐
  │  Backend API    │        │ Google OAuth 2.0 │
  │ (Cloud Run)     │        │   (Authentication)
  │ FastAPI +       │        └──────────────────┘
  │ Uvicorn         │
  └─────────────────┘
         │
    ┌────┼────┐
    │    │    │
    ▼    ▼    ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │  Firestore       │  │ Cloud Storage    │  │ Secret Manager   │
  │  (Database)      │  │ (Images)         │  │ (Credentials)    │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
  ┌─────────────────┐      ┌──────────────────┐
  │ Gemini 2.0      │      │ Cloud Build      │
  │ Flash           │      │ (CI/CD)          │
  │ (AI Analysis)   │      └──────────────────┘
  └─────────────────┘
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/server.py` | Main API routes and endpoints |
| `backend/ai_service.py` | Gemini AI integration |
| `backend/auth.py` | Authentication and OAuth |
| `backend/firestore_client.py` | Firestore database client |
| `backend/gcp_storage.py` | Cloud Storage client |
| `backend/models.py` | Pydantic request/response models |
| `frontend/src/App.js` | Main app router and layout |
| `frontend/src/pages/` | Page components |
| `frontend/src/context/AuthContext.js` | Global auth state |
| `DEPLOYMENT_GUIDE.md` | Complete deployment steps |
| `cloud-run-deploy.yaml` | Cloud Run configuration |
| `Dockerfile` | Container definition |

## Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Gemini API Documentation](https://ai.google.dev/tutorials/python_quickstart)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## Support

For issues or questions:
1. Check `DEPLOYMENT_GUIDE.md` troubleshooting section
2. Review application logs: `gcloud run logs read stolecheck-backend`
3. Check `CLAUDE.md` for developer guidance
4. Consult `IMPROVEMENTS_SUMMARY.md` for architecture details
