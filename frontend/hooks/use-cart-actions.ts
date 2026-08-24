import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, useAuth } from '@/lib/store';
import { isShoppingRestrictedUser } from '@/lib/roles';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Product } from '@/lib/types';
import { useMutation } from './use-api';

/** Current location encoded for the login ?next= parameter. */
function getLoginRedirectUrl(): string {
  const current = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(current)}`;
}

export function useCartActions() {
  const cart = useCart((state) => state.cart);
  const user = useAuth((state) => state.user);
  const addItemLocal = useCart((state) => state.addItem);
  const setCartId = useCart((state) => state.setCartId);
  const router = useRouter();

  const addToCartMutation = useMutation(
    async ({ product, quantity, cartId }: { product: Product; quantity: number; cartId: string }) => {
      return await api.post(`/store/carts/${cartId}/items/`, {
        product_id: product.id,
        quantity: quantity
      });
    },
    {
      onSuccess: () => {
        toast.success('Item added to cart successfully');
      },
      onError: (error) => {
        toast.error(`Failed to sync with server: ${error}`);
      }
    }
  );

  const addToCart = useCallback(async (product: Product, quantity: number = 1): Promise<boolean> => {
    // Guests must log in before anything is added to a cart.
    if (!user) {
      toast.info('Please log in to continue shopping.');
      router.push(getLoginRedirectUrl());
      return false;
    }

    // Store-manager accounts are not customers.
    if (isShoppingRestrictedUser(user)) {
      toast.error('Admin accounts cannot use the customer cart.');
      return false;
    }

    let currentCartId = cart?.id;

    try {
      // 1. Ensure we have a valid cart on the backend
      if (!currentCartId || currentCartId === 'temp-id' || currentCartId === '') {
        const cartRes = await api.post('/store/carts/');
        currentCartId = cartRes.data.id;
        if (currentCartId) {
          setCartId(currentCartId);
        }
      }

      if (!currentCartId) {
        throw new Error('Failed to initialize cart');
      }

      // 2. Optimistic update (local)
      addItemLocal(product, quantity);

      // 3. Sync with backend using mutation hook
      await addToCartMutation.mutate({ product, quantity, cartId: currentCartId });

      return true;
    } catch (error: any) {
      console.error('Failed to add item to cart:', error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cart?.id, router]);

  return {
    addToCart,
    isAddingToCart: addToCartMutation.loading,
    addToCartError: addToCartMutation.error,
  };
}
