
from rest_framework import permissions


def get_effective_roles(user) -> set[str]:
    """
    Map Django auth state + group membership to a set of effective roles.

    We keep legacy behaviour: staff users are treated as `admin`.
    """

    if not user or not user.is_authenticated:
        return set()

    roles: set[str] = {"customer"}

    if getattr(user, "is_staff", False):
        roles.add("admin")

    group_names = set(user.groups.values_list("name", flat=True))
    for role in {"manager", "support", "nutritionist", "analytics_admin"}:
        if role in group_names:
            roles.add(role)

    return roles


def is_store_manager_account(user) -> bool:
    """True for staff, superuser, or effective admin role — blocked from customer shopping."""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True
    return "admin" in get_effective_roles(user)


class HasAnyRole(permissions.BasePermission):
    """
    Permission helper for role-aware access control.

    Usage:
        permission_classes = [HasAnyRole]
        allowed_roles = ['admin', 'support']
    """

    allowed_roles: set[str] = set()

    def has_permission(self, request, view):
        effective = get_effective_roles(getattr(request, "user", None))
        return bool(effective.intersection(self.allowed_roles))


class IsAdminRole(HasAnyRole):
    allowed_roles = {"admin"}


class IsAnalyticsRole(HasAnyRole):
    allowed_roles = {"admin", "analytics_admin"}


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        effective = get_effective_roles(getattr(request, "user", None))
        return bool(effective.intersection({"admin"}))


class DenyStaffForCustomerWrites(permissions.BasePermission):
    """
    Store-manager accounts use admin tools; block customer shopping mutations.
    """

    message = "Staff users cannot perform customer shopping actions."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if is_store_manager_account(user) and request.method not in permissions.SAFE_METHODS:
            return False
        return True


class IsCustomer(permissions.BasePermission):
    """
    Customer-only shopping access.

    Guests (unauthenticated) are rejected with 401 and store-manager
    accounts (staff/superuser/admin role) are rejected with 403, so carts,
    orders, likes and reviews can only ever be mutated by real customers.
    """

    message = "Only customer accounts can perform shopping actions."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return not is_store_manager_account(user)


class ViewCustomerHistoryPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        if user.has_perm("store.view_history"):
            return True

        effective = get_effective_roles(user)
        return bool(effective.intersection({"admin", "support", "analytics_admin"}))
