# Ecommerce Backend API

A robust, feature-rich e-commerce backend built with Django and Django Rest Framework (DRF). This project provides a complete API for managing an online store, including product management, shopping carts, orders, payments, and customer authentication.

## 🚀 Features

### Core Store Functionality
- **Product Management**: Create, update, and retrieve products with support for images, descriptions, and pricing.
- **Collections**: Organize products into hierarchical collections.
- **Shopping Cart**: Full-featured cart management (add, update, remove items).
- **Orders**: Secure order placement and tracking.
- **Reviews & Likes**: Customer engagement through product reviews and "like" functionality.
- **Promotions**: Apply discounts to products and collections.

### User Management & Security
- **Authentication**: JWT-based authentication using **Djoser** and **SimpleJWT**.
- **Customer Profiles**: Manage customer details, addresses, and membership levels (Bronze, Silver, Gold).
- **Permissions**: Role-based access control for customers and administrators.

### Advanced Integrations
- **Payments**: Integrated with **Chapa** payment gateway (Ethiopian payment provider).
- **Background Tasks**: Asynchronous task processing using **Celery** and **Redis** (e.g., sending emails, scheduled tasks).
- **Caching**: **Redis** caching for improved performance.
- **Performance Monitoring**: **Django Silk** for profiling and inspection.
- **API Documentation**: Auto-generated interactive API docs via **drf-spectacular** (Swagger & Redoc).

## 🛠 Technology Stack

- **Backend Framework**: Django 5+, Django Rest Framework
- **Database**: PostgreSQL
- **Caching & Message Broker**: Redis
- **Task Queue**: Celery
- **Dependency Management**: Pipenv
- **Python Version**: 3.13

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Python 3.13](https://www.python.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- [Pipenv](https://pipenv.pypa.io/en/latest/)

## 🔧 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd Ecommerce
    ```

2.  **Install Dependencies**
    ```bash
    pipenv install
    pipenv shell
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory (based on `storefront/settings/developer.py` or `production.py`). You can use a template like this:

    ```env
    DEBUG=True
    SECRET_KEY=your_secret_key
    
    # Database Configuration
    DB_NAME=your_db_name
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_HOST=localhost
    DB_PORT=5432
    
    # Email Settings
    EMAIL_HOST_PASSWORD=your_email_password
    
    # Chapa Payment Config
    CHAPA_SECRET_KEY=your_chapa_secret
    CHAPA_PUBLIC_KEY=your_chapa_public
    CHAPA_ENCRYPTION_KEY=your_chapa_encryption_key
    CHAPA_API_URL=https://api.chapa.co/v1/transaction
    ```

4.  **Apply Migrations**
    ```bash
    python manage.py migrate
    ```

5.  **Create Superuser**
    ```bash
    python manage.py createsuperuser
    ```

6.  **Run Development Server**
    ```bash
    python manage.py runserver
    ```

### Render deployment: initial superuser (no shell access)

On Render Free Plan you cannot run `createsuperuser` interactively. The build script runs an idempotent management command instead:

```bash
python manage.py create_admin_if_not_exists
```

Add these **Environment** variables in the Render dashboard (copy names from `backend/.env.example`):

| Variable | Description |
| :--- | :--- |
| `DJANGO_SUPERUSER_USERNAME` | Admin login username |
| `DJANGO_SUPERUSER_EMAIL` | Admin email (also used as login; `core.User` uses email as `USERNAME_FIELD`) |
| `DJANGO_SUPERUSER_PASSWORD` | Strong password (remove from Render after first successful deploy) |

The command creates the superuser only once. On later deploys it detects the existing user and exits safely. Never hardcode credentials in `build.sh` or source code.

7.  **Run Celery Worker (Optional, for background tasks)**
    ```bash
    celery -A storefront worker --loglevel=info
    ```

## 🧪 Running Tests

This project uses `pytest` for testing.

```bash
pytest
```
To run performance tests with Locust:
```bash
locust -f locustfiles/browse_products.py
```

## 📚 API Documentation

Once the server is running, you can access the API documentation at:

- **Swagger UI**: `http://127.0.0.1:8000/api/schema/swagger-ui/`
- **Redoc**: `http://127.0.0.1:8000/api/schema/redoc/`
