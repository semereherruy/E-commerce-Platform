# Production Deployment Plan: E-commerce Platform

This document outlines the step-by-step process for deploying the E-commerce platform to a production environment.

## 1. Architectural Overview

*   **Frontend**: Next.js (Deployed on Vercel)
*   **Backend**: Django / Django Rest Framework (Deployed on Render, Railway, or DigitalOcean)
*   **Database**: PostgreSQL
*   **Cache/Queue**: Redis (For Caching and Celery tasks)
*   **Storage**: Cloudinary or AWS S3 (For user-uploaded product images)

---

## 2. Prerequisites

- [ ] Domain names (e.g., `nebistore.com` and `api.nebistore.com`)
- [ ] GitHub repository with clean `main` branch
- [ ] Accounts on:
    - [ ] Vercel (Frontend)
    - [ ] Hosting Provider (Backend - e.g., Render.com)
    - [ ] Managed PostgreSQL Provider
    - [ ] Redis Provider (e.g., Upstash or Render Redis)

---

## 3. Phase 1: Backend Infrastructure (Deploy First)

### A. Database & Redis Setup
1.  Create a **PostgreSQL** instance. Note the `DATABASE_URL`.
2.  Create a **Redis** instance. Note the `REDIS_URL` and `CELERY_BROKER_URL`.

### B. Environment Variables (Backend)
Configure these in your hosting provider's dashboard:

| Variable | Value / Description |
| :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | `storefront.settings.production` |
| `DEBUG` | `False` |
| `SECRET_KEY` | High-entropy random string |
| `DATABASE_URL` | `postgres://user:pass@host:port/db` |
| `REDIS_URL` | `redis://...` |
| `CELERY_BROKER_URL` | `redis://...` |
| `ALLOWED_HOSTS` | `api.yourdomain.com` |
| `CORS_ALLOWED_ORIGINS` | `https://yourdomain.com` |
| `SECURE_SSL_REDIRECT` | `True` |

### C. Backend Deployment Steps
1.  **Code Preparation**:
    - Ensure `gunicorn` and `whitenoise` are in your dependencies.
    - Uncomment `whitenoise` middleware in `settings/common.py` if not using S3.
2.  **Deployment Command**:
    - Build: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
    - Start: `gunicorn storefront.wsgi`
3.  **Post-Deploy**:
    - Run migrations: `python manage.py migrate`
    - Create superuser: `python manage.py createsuperuser`

---

## 4. Phase 2: Frontend Deployment (Vercel)

### A. Environment Variables (Frontend)
Configure these in the Vercel Dashboard:

| Variable | Value / Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api/v1` |

### B. Deployment Steps
1.  Import the repository into Vercel.
2.  Select the `frontend` directory as the project root (if monorepo).
3.  Vercel will auto-detect Next.js and run `npm run build`.
4.  Once deployed, assign your custom domain.

---

## 5. Security Hardening

- [ ] **SSL/TLS**: Ensure both frontend and backend are accessible ONLY via HTTPS.
- [ ] **CORS**: Verify `CORS_ALLOWED_ORIGINS` strictly matches your frontend URL.
- [ ] **JWT**: Ensure `ACCESS_TOKEN_LIFETIME` is short (e.g., 15 mins).
- [ ] **HSTS**: Verify `SECURE_HSTS_SECONDS` is active in `production.py`.
- [ ] **Database**: Disable public access to your Postgres instance.

---

## 6. Post-Deployment Verification (Smoke Test)

1.  **Connectivity**: Open `https://api.yourdomain.com/api/v1/store/products/` in browser. Should return JSON.
2.  **Auth Flow**: Register a new user on the live site → Login → Check if profile loads.
3.  **Checkout Flow**: Add item to cart → Proceed to checkout → Verify payment initialization.
4.  **Admin Flow**: Visit `/admin` on the backend and verify you can edit products.

---

## 7. Maintenance & Backups

1.  **Backups**: Enable automated daily backups for the PostgreSQL database.
2.  **Logs**: Monitor Render/Vercel logs for any `500` errors.
3.  **Updates**: Schedule a monthly review of security patches for Django and Next.js.
