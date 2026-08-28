import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductDetailClient from './ProductDetailClient';
import { Product, Review } from '@/lib/types';
import { serverApiFetch } from '@/lib/api-server';
import { extractList } from '@/lib/api-helpers';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const result = await serverApiFetch<Product>(`/store/products/${id}/`, { single: true, revalidate: 300 }); // 5 min for product detail
  const product = result.data as Product | null;
  return {
    title: product ? `${product.title} | Nebi Store` : 'Product | Nebi Store',
    description: product ? product.description : 'Product details',
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [productResult, reviewsResult] = await Promise.all([
    serverApiFetch<Product>(`/store/products/${id}/`, { single: true, revalidate: 300 }), // 5 min
    serverApiFetch<Review>(`/store/products/${id}/reviews/`, { revalidate: 600 }), // 10 min
  ]);

  const product = productResult.data as Product | null;
  const reviews = reviewsResult.error ? [] : (reviewsResult.data as Review[]);

  // Related products: find other products from the current product's collection,
  // excluding the product itself, showing at most 4. Falls back to the generic
  // list when the product has no collection.
  let relatedProducts: Product[] = [];
  if (product) {
    const collectionId =
      typeof product.collection === 'object' && product.collection
        ? product.collection.id
        : product.collection;
    const relatedEndpoint = collectionId
      ? `/store/products/?collection_id=${collectionId}&limit=5`
      : `/store/products/?limit=4`;
    const relatedResult = await serverApiFetch<Product>(relatedEndpoint, { revalidate: 600 }); // 10 min
    const candidates = relatedResult.error ? [] : (relatedResult.data as Product[]);
    relatedProducts = candidates.filter((p) => p.id !== product.id).slice(0, 4);
  }

  if (productResult.error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
            <p className="text-muted-foreground">
              {productResult.error || 'The product you\'re looking for doesn\'t exist.'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <ProductDetailClient
        initialProduct={product}
        initialReviews={reviews}
        initialRelated={relatedProducts}
      />
      <Footer />
    </div>
  );
}
