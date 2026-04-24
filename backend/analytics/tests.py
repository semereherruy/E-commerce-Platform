import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse

User = get_user_model()

@pytest.mark.django_db
class TestAnalyticsJWTAuth:
    def test_get_analytics_data_anonymous_fails(self):
        client = APIClient()
        url = reverse('analytics_data')
        response = client.get(url)
        # Should be 401 Unauthorized or 403 Forbidden depending on DRF settings
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_get_analytics_data_non_staff_fails(self):
        user = User.objects.create_user(username='testuser', password='password123', is_staff=False)
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse('analytics_data')
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_analytics_data_admin_succeeds(self):
        user = User.objects.create_user(username='adminuser', password='password123', is_staff=True)
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse('analytics_data')
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'chart_data' in response.data
        assert 'pie_data' in response.data
        assert 'summary' in response.data
