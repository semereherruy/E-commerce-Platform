'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';

import { formatEtb } from '@/lib/format-currency';
import { getEffectiveUnitPrice } from '@/lib/product-price';

const SLIDE_INTERVAL_MS = 5500;

interface HeroProductSlidesProps {
  products?: Product[];
  loading?: boolean;
}

export default function HeroProductSlides({ 
  products: initialProducts = [], 
  loading: initialLoading = false 
}: HeroProductSlidesProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialProducts.length > 0) {
      setProducts(initialProducts);
      setLoading(false);
    }
  }, [initialProducts]);


  const go = useCallback(
    (delta: number) => {
      if (products.length === 0) return;
      setIndex((i) => (i + delta + products.length) % products.length);
    },
    [products.length]
  );

  useEffect(() => {
    if (products.length <= 1) return;
    const id = window.setInterval(() => go(1), SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [products.length, go]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[500px] w-full items-center justify-center rounded-[32px] border bg-white/50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Loading featured products</span>
      </div>
    );
  }

  if (error || products.length === 0) {
    return (
      <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center gap-4 rounded-[32px] border bg-muted/30 p-8 text-center">
        <p className="font-bold text-muted-foreground">Featured products will appear when the store is connected.</p>
        <Button nativeButton={false} render={<Link href="/products" />}>Browse catalog</Button>
      </div>
    );
  }

  const product = products[index];
  const imageUrl = product.images?.[0]?.image;

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-white">
      <div className="relative h-full w-full min-h-[500px] bg-slate-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority={index === 0}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full min-h-[400px] items-center justify-center text-muted-foreground">No image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 text-white">
          <p className="text-sm font-black uppercase tracking-widest text-primary mb-4">Featured</p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-tight line-clamp-2 mb-4">
            {product.title}
          </h2>
          <p className="text-2xl md:text-3xl font-black text-primary mb-8">
            {formatEtb(getEffectiveUnitPrice(product))}
          </p>
          <Button
            className="h-14 px-8 rounded-2xl font-black uppercase text-lg"
            nativeButton={false}
            render={<Link href={`/products/${product.id}`} />}
          >
            Shop Now
          </Button>
        </div>
      </div>

      {products.length > 1 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute left-3 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border bg-white/90 shadow-md"
            onClick={() => go(-1)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-3 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border bg-white/90 shadow-md"
            onClick={() => go(1)}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="flex justify-center gap-2 py-4">
            {products.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2.5 rounded-full transition-all ${i === index ? 'w-8 bg-primary' : 'w-2.5 bg-muted-foreground/30'}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
