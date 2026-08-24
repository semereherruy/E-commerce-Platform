import pytest
from rest_framework import status
from model_bakery import baker

from store.models import Cart, CartItem, Customer, Order, Product, Review


@pytest.mark.django_db
def test_non_owner_cannot_read_other_users_cart(api_client, authenticate):
  owner = authenticate()
  owner_customer, _ = Customer.objects.get_or_create(user=owner)
  cart = baker.make(Cart, customer=owner_customer)

  other_user = baker.make("core.User")
  api_client.force_authenticate(user=other_user)

  response = api_client.get(f"/api/v1/store/carts/{cart.id}/")
  assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_order_creation_rejects_foreign_cart(api_client):
  owner = baker.make("core.User")
  owner_customer, _ = Customer.objects.get_or_create(user=owner)
  product = baker.make(Product, price=15, inventory=10)
  cart = baker.make(Cart, customer=owner_customer)
  baker.make(CartItem, cart=cart, product=product, quantity=1)

  other_user = baker.make("core.User")
  api_client.force_authenticate(user=other_user)
  Customer.objects.get_or_create(user=other_user)

  response = api_client.post("/api/v1/store/orders/", {"cart_id": str(cart.id)}, format="json")
  assert response.status_code == status.HTTP_400_BAD_REQUEST
  assert "access" in str(response.data).lower()


@pytest.mark.django_db
def test_non_staff_cannot_patch_payment_status(api_client):
  user = baker.make("core.User")
  customer, _ = Customer.objects.get_or_create(user=user)
  order = baker.make(Order, customer=customer)
  api_client.force_authenticate(user=user)

  response = api_client.patch(f"/api/v1/store/orders/{order.id}/", {"payment_status": "C"}, format="json")
  assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_review_update_blocked_for_non_owner(api_client):
  product = baker.make(Product, inventory=10)
  owner = baker.make("core.User")
  intruder = baker.make("core.User")
  review = baker.make(Review, product=product, user=owner, name="Owner", description="A")
  api_client.force_authenticate(user=intruder)

  response = api_client.patch(
    f"/api/v1/store/products/{product.id}/reviews/{review.id}/",
    {"description": "Hacked"},
    format="json",
  )
  assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_staff_cannot_create_cart(api_client):
  staff_user = baker.make("core.User", is_staff=True)
  api_client.force_authenticate(user=staff_user)

  response = api_client.post("/api/v1/store/carts/", {}, format="json")
  assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_guest_cannot_create_cart(api_client):
  response = api_client.post("/api/v1/store/carts/", {}, format="json")
  assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_guest_cannot_add_cart_items(api_client):
  product = baker.make(Product, price=10, inventory=5)
  cart = baker.make(Cart)
  api_client.force_authenticate(user=None)

  response = api_client.post(
    f"/api/v1/store/carts/{cart.id}/items/",
    {"product_id": product.id, "quantity": 1},
    format="json",
  )
  assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_customer_can_create_cart_and_add_items(api_client):
  user = baker.make("core.User", is_staff=False, is_superuser=False)
  Customer.objects.get_or_create(user=user)
  api_client.force_authenticate(user=user)

  create_response = api_client.post("/api/v1/store/carts/", {}, format="json")
  assert create_response.status_code == status.HTTP_201_CREATED

  product = baker.make(Product, price=10, inventory=5)
  item_response = api_client.post(
    f"/api/v1/store/carts/{create_response.data['id']}/items/",
    {"product_id": product.id, "quantity": 1},
    format="json",
  )
  assert item_response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_staff_cannot_add_cart_items(api_client):
  staff_user = baker.make("core.User", is_staff=True)
  customer, _ = Customer.objects.get_or_create(user=staff_user)
  cart = baker.make(Cart, customer=customer)
  product = baker.make(Product, price=10, inventory=5)
  api_client.force_authenticate(user=staff_user)

  response = api_client.post(
    f"/api/v1/store/carts/{cart.id}/items/",
    {"product_id": product.id, "quantity": 1},
    format="json",
  )
  assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_staff_cannot_place_order(api_client):
  staff_user = baker.make("core.User", is_staff=True)
  customer, _ = Customer.objects.get_or_create(user=staff_user)
  product = baker.make(Product, price=15, inventory=10)
  cart = baker.make(Cart, customer=customer)
  baker.make(CartItem, cart=cart, product=product, quantity=1)
  api_client.force_authenticate(user=staff_user)

  response = api_client.post("/api/v1/store/orders/", {"cart_id": str(cart.id)}, format="json")
  assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_stats_requires_admin(api_client):
  user = baker.make("core.User", is_staff=False)
  api_client.force_authenticate(user=user)
  response = api_client.get("/api/v1/store/admin-stats/")
  assert response.status_code == status.HTTP_403_FORBIDDEN
