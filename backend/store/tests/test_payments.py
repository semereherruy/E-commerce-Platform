import pytest
from rest_framework import status
from store.models import Order, Payment, Customer, Collection
from unittest.mock import patch

@pytest.fixture
def create_order(authenticate):
    """Fixture to create a user and an order linked to a customer."""
    def do_create_order(is_staff=False):
        user = authenticate(is_staff=is_staff)
        customer, _ = Customer.objects.get_or_create(user=user)
        
        # Standard creation without model_bakery
        collection = Collection.objects.create(title="Test Collection")
        order = Order.objects.create(customer=customer)
        return user, order
    return do_create_order

@pytest.mark.django_db
class TestPaymentFlow:
    def test_start_payment_success(self, api_client, create_order):
        """Test that starting a payment creates a Payment record and returns a mock URL."""
        user, order = create_order()
        
        response = api_client.post(f'/api/orders/{order.id}/start_payment/', {"payment_method": "chapa"}, format="json")
        
        assert response.status_code == status.HTTP_200_OK
        assert 'id' in response.data
        assert response.data['status'] == 'pending'
        assert 'mock_tx_' in response.data['id']
        assert response.data['payment_url'] is not None
        
        # Verify database state
        payment = Payment.objects.get(order=order)
        assert payment.transaction_id == response.data['id']
        assert payment.status == Payment.STATUS_PENDING
        assert payment.payment_method == "chapa"

        order.refresh_from_db()
        assert order.payment_method == "chapa"

    def test_verify_payment_post_success(self, api_client, create_order):
        """Test that verifying a payment via POST updates both Payment and Order status."""
        user, order = create_order()
        
        # 1. Start payment to generate the transaction reference
        res_start = api_client.post(f'/api/orders/{order.id}/start_payment/')
        tx_ref = res_start.data['id']
        
        # 2. Call the verify endpoint
        response = api_client.post('/api/payments/verify/', {'tx_ref': tx_ref})
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        
        # 3. Verify database updates
        payment = Payment.objects.get(transaction_id=tx_ref)
        assert payment.status == Payment.STATUS_SUCCESS
        
        order.refresh_from_db()
        assert order.payment_status == Order.PAYMENT_STATUS_COMPLETE

    def test_verify_payment_get_success(self, api_client, create_order):
        """Test that verifying a payment via GET (redirect simulation) works."""
        user, order = create_order()
        
        res_start = api_client.post(f'/api/orders/{order.id}/start_payment/')
        tx_ref = res_start.data['id']
        
        # Simulate a redirect back with the tx_ref in the query string
        response = api_client.get(f'/api/payments/verify/?tx_ref={tx_ref}')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'

    def test_start_payment_permission_denied(self, api_client, create_order, authenticate):
        """Test that a user cannot start a payment for someone else's order."""
        # Create order for User A
        _, order = create_order() 
        
        # Authenticate as User B (different username)
        authenticate(is_staff=False, username="user_b") 
        
        response = api_client.post(f'/api/orders/{order.id}/start_payment/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_verify_non_existent_payment(self, api_client, authenticate):
        """Test that verifying a non-existent transaction reference returns 404."""
        authenticate()
        response = api_client.post('/api/payments/verify/', {'tx_ref': 'non_existent_ref'})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch("store.utils.payments.ChapaProvider.verify")
    def test_verify_payment_failure_marks_order_failed(self, mock_verify, api_client, create_order):
        user, order = create_order()
        res_start = api_client.post(f'/api/orders/{order.id}/start_payment/')
        tx_ref = res_start.data['id']

        mock_verify.return_value = {"status": "error", "message": "gateway rejected"}
        response = api_client.post('/api/v1/store/payments/verify/', {'tx_ref': tx_ref}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        payment = Payment.objects.get(transaction_id=tx_ref)
        order.refresh_from_db()
        assert payment.status == Payment.STATUS_FAILED
        assert order.payment_status == Order.PAYMENT_STATUS_FAILED

    @pytest.mark.django_db
    def test_webhook_success_updates_payment(self, api_client, create_order):
        user, order = create_order()
        res_start = api_client.post(f'/api/orders/{order.id}/start_payment/')
        tx_ref = res_start.data['id']

        payload = {"tx_ref": tx_ref, "status": "success"}
        response = api_client.post('/api/v1/store/payments/webhook/', payload, format="json")
        assert response.status_code == status.HTTP_200_OK

        payment = Payment.objects.get(transaction_id=tx_ref)
        order.refresh_from_db()
        assert payment.status == Payment.STATUS_SUCCESS
        assert order.payment_status == Order.PAYMENT_STATUS_COMPLETE
