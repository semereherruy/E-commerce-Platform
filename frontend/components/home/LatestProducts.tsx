import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';
import ProductCard from '../products/ProductCard';

interface LatestProductsProps {
  products?: Product[];
  isLoading?: boolean;
}

export default function LatestProducts({
  products: initialProducts = [],
  isLoading = false
}: LatestProductsProps) {
  const products = initialProducts;

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
              Latest <span className="text-primary italic">Arrivals</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Discover our newest additions. Fresh styles and innovative designs
              that push the boundaries of fashion and performance.
            </p>
          </div>
          <Button variant="ghost" className="group font-bold text-lg h-12" nativeButton={false} render={<Link href="/products" />}>
            View All Products
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-square bg-white rounded-3xl animate-pulse" />
                <div className="h-6 w-3/4 bg-white rounded-lg animate-pulse" />
                <div className="h-6 w-1/4 bg-white rounded-lg animate-pulse" />
              </div>
            ))
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No latest products available at the moment.</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id}>
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}