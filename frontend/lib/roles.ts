import type { User } from './types';

export const ADMIN_SHOPPING_NOTICE =
  'Admin accounts are for store management only. Use a customer account to shop, review products, or create wishlists.';

type ShoppingRestrictedUser = Pick<User, 'role' | 'is_staff' | 'is_superuser'> | null | undefined;

/** True when the account must not use customer shopping features. */
export function isShoppingRestrictedUser(user: ShoppingRestrictedUser): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.is_staff) return true;
  if (user.is_superuser) return true;
  return false;
}

/** Cookie/middleware helper — role is set at login from the API. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}
