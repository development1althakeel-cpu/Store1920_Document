'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/lib/useAuth';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { showWishlistStorefrontToast } from '@/lib/storefrontActionToast';

function getGuestWishlist() {
  try {
    const raw = localStorage.getItem('guestWishlist');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useProductWishlist(product, options = {}) {
  const { user } = useAuth();
  const { t } = useStorefrontI18n();
  const productId = String(product?._id || product?.id || '').trim();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  const matchesProductId = useCallback((value) => {
    if (!productId || value == null) return false;
    return String(value) === productId;
  }, [productId]);

  const checkStatus = useCallback(async () => {
    if (!productId) {
      setIsInWishlist(false);
      return;
    }

    try {
      if (user) {
        const token = await user.getIdToken?.();
        if (!token) return;
        const { data } = await axios.get('/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const isInList = data.wishlist?.some((item) => matchesProductId(item.productId));
        setIsInWishlist(Boolean(isInList));
        return;
      }

      const guestWishlist = getGuestWishlist();
      setIsInWishlist(guestWishlist.some((item) => matchesProductId(item?.productId)));
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  }, [productId, user, matchesProductId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    const handleUpdate = () => {
      checkStatus();
    };
    window.addEventListener('wishlistUpdated', handleUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleUpdate);
  }, [checkStatus]);

  const toggleWishlist = useCallback(async () => {
    if (loading || !productId) return null;

    try {
      setLoading(true);

      if (user) {
        const token = await user.getIdToken?.();
        if (!token) throw new Error('No auth token');
        const action = isInWishlist ? 'remove' : 'add';
        await axios.post(
          '/api/wishlist',
          { productId, action },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsInWishlist(!isInWishlist);
        window.dispatchEvent(new Event('wishlistUpdated'));
        const result = isInWishlist ? 'removed' : 'added';
        showWishlistStorefrontToast(result, t);
        return result;
      }

      const guestWishlist = getGuestWishlist();
      if (isInWishlist) {
        const updatedWishlist = guestWishlist.filter((item) => !matchesProductId(item?.productId));
        localStorage.setItem('guestWishlist', JSON.stringify(updatedWishlist));
        setIsInWishlist(false);
        window.dispatchEvent(new Event('wishlistUpdated'));
        showWishlistStorefrontToast('removed', t);
        return 'removed';
      }

      const wishlistItem = {
        productId,
        slug: product?.slug,
        name: product?.name,
        price: options.price ?? product?.price,
        AED: options.aed ?? product?.AED,
        images: options.images ?? product?.images,
        discount: options.discount ?? product?.discount,
        inStock: product?.inStock,
        addedAt: new Date().toISOString(),
      };
      guestWishlist.push(wishlistItem);
      localStorage.setItem('guestWishlist', JSON.stringify(guestWishlist));
      setIsInWishlist(true);
      window.dispatchEvent(new Event('wishlistUpdated'));
      showWishlistStorefrontToast('added', t);
      return 'added';
    } catch (error) {
      console.error('Error updating wishlist:', error);
      showWishlistStorefrontToast('error', t);
      return 'error';
    } finally {
      setLoading(false);
    }
  }, [loading, productId, user, isInWishlist, product, options.price, options.aed, options.images, options.discount, matchesProductId, t]);

  return {
    isInWishlist,
    loading,
    toggleWishlist,
  };
}
