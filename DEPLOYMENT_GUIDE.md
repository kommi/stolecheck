# StoleCheck Deployment Guide

Complete guide to deploying StoleCheck on Google Cloud Platform with Gemini AI, Cloud Storage, and Cloud Run.

## Prerequisites

1. **Google Cloud Account** - with billing enabled
2. **gcloud CLI** - installed and configured
3. **Docker** - installed locally for testing
4. **Git** - for version control
5. **Node.js 20+** - for frontend builds

## Phase 1: GCP Project Setup (15 minutes)

### 1. Create GCP Project
```bash
gcloud projects create stolecheck-prod --name="StoleCheck Production"
gcloud config set project stolecheck-prod
```

### 2. Enable Required APIs
```bash
gcloud services enable \
  aiplatform.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudrun.googleapis.com \
  storage-api.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com
```

### 3. Create Service Account for Backend
```bash
gcloud iam service-accounts create stolecheck-backend-sa \
  --display-name="StoleCheck Backend Service Account"

gcloud projects add-iam-policy-binding stolecheck-prod \
  --member=serviceAccount:stolecheck-backend-sa@stolecheck-prod.iam.gserviceaccount.com \
  --role=roles/editor
```

### 4. Create Service Account Keys
```bash
gcloud iam service-accounts keys create backend-sa.json \
  --iam-account=stolecheck-backend-sa@stolecheck-prod.iam.gserviceaccount.com
```

## Phase 2: Database Setup (10 minutes)

### 1. Create Firestore Database
```bash
gcloud firestore databases create \
  --location=us-central1 \
  --type=native
```

### 2. Create Cloud Storage Bucket
```bash
gsutil mb -l us-central1 -b on gs://stolecheck-images-prod

# Set lifecycle policy to delete old temp files
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 7, "matchesPrefix": ["temp/"]}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://stolecheck-images-prod
```

### 3. Enable Uniform Bucket-Level Access
```bash
gsutil uniformbucketlevelaccess set on gs://stolecheck-images-prod
```

## Phase 3: Authentication Setup (15 minutes)

### 1. Create OAuth 2.0 Consent Screen
1. Go to [GCP Console → APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select "External"
3. Fill in application name: "StoleCheck"
4. Add your email as test user
5. Complete all required information

### 2. Create OAuth 2.0 Credentials
1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: "StoleCheck Web"
5. **Authorized JavaScript origins:**
   - http://localhost:3000
   - https://YOUR_FRONTEND_URL.com
6. **Authorized redirect URIs:**
   - http://localhost:8000/api/auth/google-callback
   - https://YOUR_BACKEND_URL.run.app/api/auth/google-callback
7. Click Create and save credentials

### 3. Create Secrets in Secret Manager
```bash
# Store Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# Store OAuth Client Secret
echo -n "YOUR_OAUTH_CLIENT_SECRET" | gcloud secrets create google-oauth-secret --data-file=-

# Store JWT Secret
echo -n "$(openssl rand -base64 32)" | gcloud secrets create jwt-secret --data-file=-
```

### 4. Grant Service Account Access to Secrets
```bash
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:stolecheck-backend-sa@stolecheck-prod.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding google-oauth-secret \
  --member=serviceAccount:stolecheck-backend-sa@stolecheck-prod.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding jwt-secret \
  --member=serviceAccount:stolecheck-backend-sa@stolecheck-prod.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

## Phase 4: Backend Deployment (20 minutes)

### 1. Set Environment Variables
```bash
export PROJECT_ID=stolecheck-prod
export REGION=us-central1
export GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_KEY"
export GOOGLE_OAUTH_CLIENT_ID="YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com"
export GOOGLE_OAUTH_CLIENT_SECRET="YOUR_OAUTH_CLIENT_SECRET"
export JWT_SECRET=$(openssl rand -base64 32)
```

### 2. Build and Push Docker Image
```bash
# Configure Docker authentication
gcloud auth configure-docker

# Build image
docker build -t gcr.io/$PROJECT_ID/stolecheck-backend:latest .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/stolecheck-backend:latest

# Alternative: Use gcloud builds
gcloud builds submit --tag gcr.io/$PROJECT_ID/stolecheck-backend:latest
```

### 3. Deploy to Cloud Run
```bash
gcloud run deploy stolecheck-backend \
  --image gcr.io/$PROJECT_ID/stolecheck-backend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --min-instances 1 \
  --max-instances 10 \
  --service-account stolecheck-backend-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars \
    GCP_PROJECT_ID=$PROJECT_ID,\
    GCS_BUCKET_NAME=stolecheck-images-prod,\
    GOOGLE_OAUTH_CLIENT_ID=$GOOGLE_OAUTH_CLIENT_ID,\
    DEPLOYMENT_ENV=gcp,\
    CORS_ORIGINS="http://localhost:3000,https://YOUR_FRONTEND_URL" \
  --set-cloudsql-instances="" \
  --ingress all
```

### 4. Update Cloud Run with Secrets
```bash
gcloud run services update stolecheck-backend \
  --update-secrets \
    GEMINI_API_KEY=gemini-api-key:latest,\
    GOOGLE_OAUTH_CLIENT_SECRET=google-oauth-secret:latest,\
    JWT_SECRET=jwt-secret:latest \
  --region $REGION
```

### 5. Get Backend URL
```bash
BACKEND_URL=$(gcloud run services describe stolecheck-backend \
  --region $REGION \
  --format 'value(status.url)')
echo "Backend URL: $BACKEND_URL"
```

## Phase 5: Frontend Deployment (15 minutes)

### 1. Create Dockerfile for Frontend
Create `frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ .
RUN REACT_APP_BACKEND_URL=$BACKEND_URL \
    REACT_APP_GOOGLE_OAUTH_CLIENT_ID=$GOOGLE_OAUTH_CLIENT_ID \
    yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Build Frontend Image
```bash
docker build -t gcr.io/$PROJECT_ID/stolecheck-frontend:latest \
  --build-arg BACKEND_URL=$BACKEND_URL \
  --build-arg GOOGLE_OAUTH_CLIENT_ID=$GOOGLE_OAUTH_CLIENT_ID \
  -f frontend/Dockerfile .

docker push gcr.io/$PROJECT_ID/stolecheck-frontend:latest
```

### 3. Deploy Frontend
```bash
gcloud run deploy stolecheck-frontend \
  --image gcr.io/$PROJECT_ID/stolecheck-frontend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 256Mi \
  --timeout 30 \
  --min-instances 1 \
  --max-instances 5 \
  --ingress all

FRONTEND_URL=$(gcloud run services describe stolecheck-frontend \
  --region $REGION \
  --format 'value(status.url)')
echo "Frontend URL: $FRONTEND_URL"
```

### 4. Update OAuth Redirect URI
In GCP Console → APIs & Services → Credentials:
1. Edit OAuth 2.0 Client ID
2. Add authorized redirect URI: `$FRONTEND_URL/auth/callback`
3. Save

## Phase 6: Verification (10 minutes)

### 1. Health Check
```bash
curl $BACKEND_URL/api/health
# Expected: {"status": "healthy"}
```

### 2. Test Image Upload
```bash
curl -X POST $BACKEND_URL/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Item",
    "description": "Test",
    "category": "electronics",
    "images": ["BASE64_ENCODED_IMAGE"]
  }'
```

### 3. Test Gemini AI
Create a test item with an image and verify AI analysis results

### 4. Test OAuth Flow
1. Visit frontend URL
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify you're logged in

## Phase 7: Monitoring & Security (20 minutes)

### 1. Set Up Cloud Logging
```bash
gcloud logging sinks create stolecheck-backend-logs \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/stolecheck_logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="stolecheck-backend"'
```

### 2. Configure Cloud Monitoring
```bash
gcloud monitoring alert-policies create \
  --notification-channels=CHANNEL_ID \
  --alert-strategy="display_name=StoleCheck Backend Error Rate"
```

### 3. Enable Binary Authorization (optional but recommended)
```bash
gcloud container binauthz policy import policy.yaml
```

### 4. Set Up Cloud Armor (DDoS protection)
```bash
gcloud compute security-policies create stolecheck-policy \
  --type CLOUD_ARMOR

gcloud compute security-policies rules create 100 \
  --security-policy=stolecheck-policy \
  --action allow \
  --priority 100 \
  --origin-region-list="US"
```

## Phase 8: Data Migration from MongoDB (30 minutes)

### 1. Create Migration Script
See `backend/migrate_from_mongo.py`

### 2. Run Migration
```bash
python backend/migrate_from_mongo.py \
  --mongo-url="$MONGO_URL" \
  --db-name="stolecheck" \
  --gcp-project-id="$PROJECT_ID"
```

### 3. Validate Migration
```bash
python backend/validate_migration.py \
  --gcp-project-id="$PROJECT_ID" \
  --mongo-url="$MONGO_URL"
```

## Phase 9: Custom Domain Setup (15 minutes)

### 1. Map Custom Domain to Cloud Run (Backend)
```bash
gcloud run domain-mappings create \
  --service stolecheck-backend \
  --domain api.stolecheck.app \
  --region $REGION
```

### 2. Map Custom Domain to Cloud Run (Frontend)
```bash
gcloud run domain-mappings create \
  --service stolecheck-frontend \
  --domain app.stolecheck.app \
  --region $REGION
```

### 3. Update DNS Records
Add CNAME records to your DNS provider:
- `api.stolecheck.app` → `ghs.googleusercontent.com`
- `app.stolecheck.app` → `ghs.googleusercontent.com`

## Deployment Commands Quick Reference

### View Logs
```bash
gcloud run logs read stolecheck-backend --region $REGION --limit 50
```

### Update Environment Variables
```bash
gcloud run services update stolecheck-backend \
  --update-env-vars KEY=value \
  --region $REGION
```

### Rollback to Previous Version
```bash
gcloud run services update-traffic stolecheck-backend \
  --to-revisions REVISION_TAG=100 \
  --region $REGION
```

### Scale Service
```bash
gcloud run services update stolecheck-backend \
  --min-instances 2 \
  --max-instances 20 \
  --region $REGION
```

## Troubleshooting

### 502 Bad Gateway
- Check service logs: `gcloud run logs read stolecheck-backend`
- Verify Firestore is accessible
- Check service account permissions

### CORS Errors
- Update CORS_ORIGINS environment variable
- Restart the service

### Images Not Uploading
- Check GCS bucket permissions
- Verify GOOGLE_APPLICATION_CREDENTIALS are correct
- Check bucket-level access settings

### OAuth Not Working
- Verify redirect URIs in GCP Console
- Check GOOGLE_OAUTH_CLIENT_ID and SECRET
- Ensure frontend is on HTTPS

## Cost Optimization

1. **Cloud Run**: Set min-instances to 0 for cost savings
2. **Firestore**: Enable automatic scaling
3. **Cloud Storage**: Set lifecycle policies for temp data
4. **Gemini API**: Monitor usage in Cloud Console

## Security Checklist

- [ ] All secrets stored in Secret Manager
- [ ] Service account has minimal required permissions
- [ ] CORS origins restricted to known domains
- [ ] Cloud Armor DDoS protection enabled
- [ ] Binary Authorization for container images
- [ ] Firestore security rules configured
- [ ] Cloud Storage bucket encryption enabled
- [ ] Cloud Run services set to allowUnauthenticated: false for APIs

## Next Steps

1. Set up CI/CD pipeline with Cloud Build
2. Configure backup strategy for Firestore
3. Set up alerting for errors and failures
4. Configure production monitoring dashboard
5. Plan rollback strategy
6. Document runbook for common issues
