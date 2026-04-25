"""
Lightweight payment API stubs used by the Next.js frontend (`/api/...`).
Replace with real gateway integration (e.g. Chapa) when ready.
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import uuid
from .models import Order, Payment


class StartPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(Order, pk=order_id)
        if not request.user.is_staff and order.customer.user_id != request.user.id:
            return Response(
                {"detail": "You do not have permission to start payment for this order."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        # Mock initialization: Create or update a Payment record
        payment, created = Payment.objects.get_or_create(
            order=order,
            defaults={'amount': order.total}
        )
        
        # Generate a unique mock transaction ID if it doesn't exist
        if not payment.transaction_id:
            payment.transaction_id = f"mock_tx_{uuid.uuid4().hex[:12]}"
            payment.save()

        now = timezone.now().isoformat()
        return Response(
            {
                "id": payment.transaction_id,
                "order_id": str(order_id),
                "amount": float(order.total),
                "currency": "ETB",
                "status": "pending",
                "payment_method": (request.data or {}).get("payment_method", "chapa"),
                "payment_url": f"http://localhost:3000/checkout/verify?tx_ref={payment.transaction_id}",
                "created_at": now,
                "updated_at": now,
            }
        )


from rest_framework import serializers
from drf_spectacular.utils import extend_schema


class PaymentVerificationSerializer(serializers.Serializer):
    tx_ref = serializers.CharField(required=False, help_text="The transaction reference (tx_ref or payment_id)")
    payment_reference = serializers.CharField(required=False)
    payment_id = serializers.CharField(required=False)


class VerifyPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PaymentVerificationSerializer)
    def get(self, request):
        tx_ref = request.query_params.get("payment_id") or request.query_params.get("tx_ref")
        if not tx_ref:
            return Response({"detail": "tx_ref is required in query parameters"}, status=status.HTTP_400_BAD_REQUEST)
        
        return self._verify(tx_ref)

    @extend_schema(request=PaymentVerificationSerializer)
    def post(self, request):
        serializer = PaymentVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Look for the reference in the validated data or query params
        data = serializer.validated_data
        tx_ref = (
            data.get("tx_ref") or 
            data.get("payment_reference") or 
            data.get("payment_id") or
            request.query_params.get("tx_ref") or
            request.query_params.get("payment_id")
        )
        
        if not tx_ref:
            return Response(
                {"detail": "Payment reference (tx_ref, payment_reference, or payment_id) is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return self._verify(tx_ref)

    def _verify(self, tx_ref):
        payment = get_object_or_404(Payment, transaction_id=tx_ref)
        
        # Only mark as success if it's not already succeeded
        if payment.status != Payment.STATUS_SUCCESS:
            payment.mark_success()
            
        now = timezone.now().isoformat()
        return Response(
            {
                "id": tx_ref,
                "status": "success",
                "message": "Mock payment verified successfully.",
                "transaction_id": tx_ref,
                "verified_at": now,
            }
        )
