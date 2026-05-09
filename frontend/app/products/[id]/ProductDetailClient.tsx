'use client';

import React, { useState, useEffect, useRef } from 'react';
import ProductCard from '@/components/products/ProductCard';
import { Product, Review } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, Share2, ShoppingCart, Plus, Minus, MessageSquare, Truck, ShieldCheck, RefreshCcw, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import StarRating from '@/components/products/StarRating';
import { useCartActions } from '@/hooks/use-cart-actions';

import { extractList, getApiErrorMessage } from '@/lib/api-helpers';
import { formatEtb } from '@/lib/format-currency';
import { getEffectiveUnitPrice } from '@/lib/product-price';
import { FREE_SHIPPING_MIN_ETB } from '@/lib/shipping';

interface ProductDetailClientProps {
  initialProduct: Product;
  initialReviews: Review[];
  initialRelated: Product[];
}

export default function ProductDetailClient({
  initialProduct,
  initialReviews,
  initialRelated,
}: ProductDetailClientProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>(initialRelated);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const { addToCart } = useCartActions();

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const reviewFormRef = useRef<HTMLFormElement>(null);

  // Sync authenticated state on mount
  useEffect(() => {
    const refreshProduct = async () => {
      try {
        const res = await api.get(`/store/products/${initialProduct.id}/`);
        setProduct(res.data);
      } catch (err) {
        console.error('Failed to sync product state on mount', err);
      }
    };
    refreshProduct();
  }, [initialProduct.id]);



  const handleAddToCart = async () => {
    try {
      await addToCart(product, quantity);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  // Like/dislike: backend exposes POST /likes/ as a toggle only (no separate dislike endpoint).
  const handleLike = async () => {
    if (isLikeLoading) return;
    const wasLiked = !!product.is_liked;
    const prevCount = product.total_likes ?? 0;
    
    // Optimistic update
    setProduct((prev) => ({
      ...prev,
      is_liked: !wasLiked,
      total_likes: Math.max(0, prevCount + (wasLiked ? -1 : 1)),
    }));
    
    setIsLikeLoading(true);
    try {
      const response = await api.post(`/store/products/${product.id}/likes/`);
      const newLiked = !!response.data.liked;
      const count =
        typeof response.data.likes_count === 'number'
          ? response.data.likes_count
          : (newLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
          
      setProduct((prev) => ({ 
        ...prev, 
        is_liked: newLiked, 
        total_likes: count 
      }));
    } catch (error: unknown) {
      // Revert on error
      setProduct((prev) => ({ 
        ...prev, 
        is_liked: wasLiked, 
        total_likes: prevCount 
      }));
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) {
        toast.error('Log in to save favorites.');
      } else {
        toast.error(getApiErrorMessage(error, 'Failed to update like'));
      }
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: product.title,
      text: product.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingReview) return;
    setSubmittingReview(true);
    try {
      const res = await api.post(`/store/products/${product.id}/reviews/`, {
        name: reviewName,
        description: reviewText,
        rating: reviewRating,
      });
      setReviews(prev => [res.data, ...prev]);
      setShowReviewForm(false);
      setReviewName('');
      setReviewText('');
      setReviewRating(5);
      toast.success('Review submitted!');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to submit review'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const effectivePrice = getEffectiveUnitPrice(product);
  const isOnSale = product.is_on_sale && product.discounted_price;
  const hasFreeShipping = effectivePrice >= FREE_SHIPPING_MIN_ETB;

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images Gallery */}
        <div className="space-y-6">
          <div 
            className="aspect-square relative overflow-hidden rounded-[2rem] bg-cream shadow-2xl cursor-zoom-in border border-white/20"
            onMouseMove={handleImageMouseMove}
            onClick={handleImageClick}
            style={isZoomed ? {
              cursor: 'zoom-out',
              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
              transform: 'scale(2)',
            } : {}}
          >
            <Image
              src={product.images?.[selectedImage]?.image || 'https://picsum.photos/seed/product/600/600'}
              alt={product.title}
              fill
              className="object-cover transition-all duration-300"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {isOnSale && (
              <Badge className="absolute top-6 left-6 bg-destructive text-destructive-foreground px-4 py-2 text-sm font-black rounded-full shadow-lg">
                {product.discount_label || 'SALE'}
              </Badge>
            )}
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {product.images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden transition-all duration-300 border-4",
                    selectedImage === index 
                      ? "border-primary shadow-lg scale-105" 
                      : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                  )}
                >
                  <Image
                    src={img.image}
                    alt={`${product.title} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {selectedImage === index && (
                    <div className="absolute inset-0 bg-primary/10" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase mb-2">
              {product.title}
            </h1>
            <p className="text-muted-foreground text-lg">{product.description}</p>
          </div>

          {/* Price */}
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black text-primary">
              {formatEtb(effectivePrice)}
            </div>
            {isOnSale && (
              <div className="text-xl text-muted-foreground line-through">
                {formatEtb(product.unit_price)}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {isOnSale && <Badge variant="destructive">ON SALE</Badge>}
            {hasFreeShipping && <Badge variant="secondary">FREE SHIPPING</Badge>}
            {product.inventory > 0 ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                {product.inventory < 10 ? `Only ${product.inventory} left` : 'In Stock'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Quantity & Add to Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="px-4 py-2 font-bold">{quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleAddToCart} className="flex-1 h-12">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
          </div>

          {/* Mobile Sticky Add to Cart */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50">
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-4 py-2 font-bold">{quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={handleAddToCart} className="flex-1 h-12">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart - {formatEtb(effectivePrice * quantity)}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleLike}
              disabled={isLikeLoading}
              aria-pressed={!!product.is_liked}
              aria-label={product.is_liked ? 'Remove from favorites' : 'Add to favorites'}
              title="Tap to save or remove — there is no separate dislike action"
              className={cn(
                "transition-all active:scale-125 h-12 px-6", 
                product.is_liked ? 'border-destructive/30 bg-destructive/5 text-destructive' : ''
              )}
            >
              <Heart 
                className={cn("h-5 w-5 mr-2 transition-transform", product.is_liked ? 'scale-110' : '')} 
                fill={product.is_liked ? "currentColor" : "none"}
              />
              <span className="font-bold">{product.total_likes}</span>
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-5 w-5 mr-2" />
              Share
            </Button>
          </div>

          {/* Shipping Info */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <span className="font-bold">
                {hasFreeShipping ? 'FREE Shipping' : `Shipping: ${formatEtb(150)}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>Secure Checkout & Returns</span>
            </div>
            <div className="flex items-center gap-3">
              <RefreshCcw className="h-5 w-5 text-primary" />
              <span>30-Day Return Policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="mt-16">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="related">Related Products</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-8">
          <div className="prose max-w-none">
            <p>{product.description}</p>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Customer Reviews</h3>
              <Button onClick={() => setShowReviewForm(!showReviewForm)}>
                <MessageSquare className="h-5 w-5 mr-2" />
                Write Review
              </Button>
            </div>

            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="p-6 border rounded-lg space-y-4" ref={reviewFormRef}>
                <div>
                  <label className="block font-bold mb-2">Name</label>
                  <Input
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="focus:outline-none transition-transform active:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 ${star <= reviewRating ? 'fill-primary text-primary' : 'text-muted-foreground/20 hover:text-primary/40'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-2">Review</label>
                  <textarea
                    className="w-full p-3 border rounded-lg"
                    rows={4}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={submittingReview}>
                  {submittingReview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Review
                </Button>
              </form>
            )}

            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold">{review.name}</div>
                      <StarRating rating={review.rating} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(review.date).toLocaleDateString()}
                    </div>
                  </div>
                  <p>{review.description}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="related" className="mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}