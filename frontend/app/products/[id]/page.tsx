'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
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
import { api } from '@/lib/api-client';
import StarRating from '@/components/products/StarRating';
import { useCartActions } from '@/hooks/use-cart-actions';

import { extractList, getApiErrorMessage } from '@/lib/api-helpers';
import { formatEtb } from '@/lib/format-currency';
import { getEffectiveUnitPrice } from '@/lib/product-price';
import { FREE_SHIPPING_MIN_ETB } from '@/lib/shipping';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCartActions();

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const reviewFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const productRes = await api.get(`/store/products/${id}/`);
        setProduct(productRes.data);
        setIsLiked(productRes.data.is_liked);

        const reviewsRes = await api.get(`/store/products/${id}/reviews/`);
        setReviews(extractList(reviewsRes.data));

        const relatedRes = await api.get('/store/products/');
        const related = extractList<Product>(relatedRes.data).filter((p) => p.id !== Number(id)).slice(0, 4);
        setRelatedProducts(related);
      } catch (error: any) {
        toast.error(getApiErrorMessage(error, 'Unable to load this product right now.'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    await addToCart(product, quantity);
  };

  const handleLikeToggle = async () => {
    if (!product || isLikeLoading) return;
    
    // Optimistic update
    setIsLiked(!isLiked);
    setIsLikeLoading(true);
    
    try {
      const response = await api.post(`/store/products/${product.id}/likes/`);
      setIsLiked(response.data.liked);
    } catch (error: any) {
      // Revert on error
      setIsLiked(!isLiked);
      if (error.response?.status === 401) {
        toast.error('Please log in to like products');
      } else {
        toast.error('Failed to update like status');
      }
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    
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
      // Handle cancellation or other errors
    }
  };


  const handleSubmitReview = async () => {
    if (!reviewName.trim()) { toast.error('Please enter your name.'); return; }
    if (reviewText.trim().length < 10) { toast.error('Review must be at least 10 characters.'); return; }
    setSubmittingReview(true);
    try {
      const res = await api.post(`/store/products/${id}/reviews/`, {
        name: reviewName.trim(),
        description: reviewText.trim(),
        rating: reviewRating,
      });
      setReviews(prev => [res.data, ...prev]);
      setReviewName('');
      setReviewText('');
      setReviewRating(5);
      setShowReviewForm(false);
      toast.success('Review submitted! Thank you.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to submit review. Try again.'));
    } finally {
      setSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) return null;

  const displayUnit = getEffectiveUnitPrice(product);
  const taxDelta = product.price_with_tax - displayUnit;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-white shadow-xl border-4 border-white">
              <Image 
                src={product.images[selectedImage]?.image} 
                alt={product.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              {product.is_on_sale && (
                <Badge className="absolute top-6 left-6 h-8 px-4 text-sm font-bold bg-destructive">
                  {product.discount_label}
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, idx) => (
                <button 
                  key={img.id}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <Image src={img.image} alt="" fill className="object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-6">
                <Badge variant="outline" className="text-primary font-bold tracking-widest uppercase mb-4 py-1 px-3 border-primary/20">
                {typeof product.collection === 'object' && product.collection ? product.collection.title : ''}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-4">
                {product.title}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <StarRating rating={product.average_rating || 0} size={4} starClassName="fill-primary text-primary" />
                  <span className="text-sm font-bold ml-2">
                    {product.reviews_count > 0 ? `${product.average_rating.toFixed(1)} (${product.reviews_count} review${product.reviews_count !== 1 ? 's' : ''})` : 'No reviews yet'}
                  </span>
                </div>

                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">SKU: NB-2026-X1</span>
              </div>
            </div>

            <div className="mb-8 p-6 rounded-3xl bg-primary/5 border border-primary/10">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-black text-primary">
                  {formatEtb(displayUnit)}
                </span>
                {product.is_on_sale && (
                  <span className="text-xl text-muted-foreground line-through font-bold">
                    {formatEtb(product.unit_price)}
                  </span>
                )}
              </div>
              <p className="text-sm text-primary font-bold">
                + {formatEtb(taxDelta)} tax included
              </p>
            </div>

            <div className="mb-10 space-y-6">
              <p className="text-muted-foreground leading-relaxed text-lg">
                {product.description}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center border-2 rounded-2xl p-1 bg-white">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-12 w-12 rounded-xl"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-black text-xl">{quantity}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-12 w-12 rounded-xl"
                    onClick={() => setQuantity(Math.min(product.inventory, quantity + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button className="flex-grow h-14 text-lg font-black shadow-xl shadow-primary/20 gap-3 group" onClick={handleAddToCart}>
                  <ShoppingCart className="h-5 w-5 transition-transform group-hover:scale-110" />
                  ADD TO CART
                </Button>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleLikeToggle}
                  disabled={isLikeLoading}
                  className={`h-14 w-14 rounded-2xl border-2 transition-all active:scale-95 ${isLiked ? 'border-destructive/20 bg-destructive/5' : ''}`}
                >
                  <Heart className={`h-6 w-6 transition-colors ${isLiked ? 'fill-destructive text-destructive' : ''}`} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleShare}
                  className="h-14 w-14 rounded-2xl border-2 transition-all active:scale-95 hover:bg-primary/5"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
              
              <p className="text-sm font-bold flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${product.inventory > 10 ? 'bg-green-500' : 'bg-destructive'}`} />
                {product.inventory} items remaining in stock
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t">
              <div className="flex items-center gap-3">
                <Truck className="h-10 w-10 text-primary opacity-50" />
                <div className="text-xs font-bold leading-tight">FREE WORLDWIDE<br/>SHIPPING</div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-10 w-10 text-primary opacity-50" />
                <div className="text-xs font-bold leading-tight">2 YEARS BRAND<br/>WARRANTY</div>
              </div>
              <div className="flex items-center gap-3">
                <RefreshCcw className="h-10 w-10 text-primary opacity-50" />
                <div className="text-xs font-bold leading-tight">30 DAYS EASY<br/>RETURNS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs section */}
        <section className="mb-24">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-16 bg-cream/30 p-2 rounded-3xl">
              <TabsTrigger value="details" className="rounded-2xl font-black uppercase text-sm">Description</TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-2xl font-black uppercase text-sm">Reviews ({reviews.length})</TabsTrigger>
              <TabsTrigger value="shipping" className="rounded-2xl font-black uppercase text-sm">Shipping Info</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-8 p-8 bg-white rounded-3xl shadow-sm border leading-relaxed">
              <h3 className="text-2xl font-black uppercase mb-6 tracking-tighter">Product Specifications</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground font-medium">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Breathable advanced mesh technology
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Ultra-light carbon fiber plate
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Dual-density foam midsole
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  High-abrasion rubber outsole
                </li>
              </ul>
            </TabsContent>
            <TabsContent value="reviews" className="mt-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 px-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter">
                  Customer Voices
                  <span className="ml-3 text-sm font-bold text-muted-foreground normal-case tracking-normal">
                    ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <Button
                  className="font-bold gap-2"
                  onClick={() => {
                    setShowReviewForm(v => !v);
                    setTimeout(() => reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  {showReviewForm ? 'CANCEL' : 'WRITE A REVIEW'}
                </Button>
              </div>

              {/* Review submission form */}
              {showReviewForm && (
                <div ref={reviewFormRef} className="p-8 bg-primary/5 border-2 border-primary/20 rounded-3xl space-y-5 mb-6">
                  <h4 className="text-lg font-black uppercase tracking-tight">Share Your Experience</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-primary">Your Name *</label>
                    <Input
                      value={reviewName}
                      onChange={e => setReviewName(e.target.value)}
                      placeholder="e.g. Abebe Bikila"
                      className="h-12 border-2"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-primary">Your Rating *</label>
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
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-primary">Your Review *</label>
                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder="Tell others what you think about this product (min 10 characters)..."
                      rows={4}
                      className="w-full border-2 rounded-xl p-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={1000}
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{reviewText.length}/1000</p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewForm(false)}
                      className="h-12 rounded-2xl border-2 font-bold px-6"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitReview}
                      disabled={submittingReview || !reviewName.trim() || reviewText.trim().length < 10}
                      className="h-12 rounded-2xl font-black px-8 shadow-lg"
                    >
                      {submittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Submit Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Review cards */}
              <div className="grid gap-6">
                {reviews.map((review) => (
                  <div key={review.id} className="p-8 bg-white rounded-3xl shadow-sm border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-black text-lg mb-1">{review.name}</p>
                        <div className="flex gap-1">
                          <StarRating rating={review.rating || 5} size={3} starClassName="fill-primary text-primary" />
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground font-medium leading-relaxed italic">&quot;{review.description}&quot;</p>
                  </div>
                ))}
                {reviews.length === 0 && !showReviewForm && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-bold">No reviews yet.</p>
                    <p className="text-sm">Be the first to share your experience!</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="shipping" className="mt-8 p-8 bg-white rounded-3xl shadow-sm border leading-relaxed">
               <h3 className="text-2xl font-black uppercase mb-6 tracking-tighter">Shipping & Delivery</h3>
               <p className="text-muted-foreground font-medium">
                 We offer free standard delivery on orders over {formatEtb(FREE_SHIPPING_MIN_ETB)} subtotal. Domestic delivery typically takes 3–7 business days.
                 Express options may be available at checkout where applicable.
                 All premium orders are shipped in our signature Nebi Store protective packaging to ensure 
                 your items arrive in pristine condition.
               </p>
            </TabsContent>
          </Tabs>
        </section>

        {/* Related Products */}
        <section>
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none">
              Match <br /> <span className="text-primary italic">The Vibe</span>
            </h2>
            <Button variant="ghost" className="font-bold underline underline-offset-8">EXPLORE ALL</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
