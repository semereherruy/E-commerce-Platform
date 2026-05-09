import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/home/Hero';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import LatestProducts from '@/components/home/LatestProducts';
import TrendingProducts from '@/components/home/TrendingProducts';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { ArrowRight, Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { serverApiFetch } from '@/lib/api-server';
import { Product, Collection } from '@/lib/types';
import { Suspense } from 'react';

export const metadata = {
  title: 'Nebi Store | Premium Ecommerce',
  description: 'Discover the latest fashion and lifestyle products at Nebi Store. Shop trending items, exclusive collections, and enjoy fast delivery.',
  keywords: 'fashion, ecommerce, clothing, accessories, online shopping',
  openGraph: {
    title: 'Nebi Store | Premium Ecommerce',
    description: 'Discover the latest fashion and lifestyle products.',
    type: 'website',
  },
};


export default async function Home() {
  // Parallel fetch for homepage data with appropriate caching
  const [heroResult, featuredResult, latestResult, trendingResult, collectionsResult] = await Promise.all([
    serverApiFetch<Product>('/store/products/?limit=8', { revalidate: 300 }), // 5 min for hero
    serverApiFetch<Product>('/store/products/?is_on_sale=true&limit=4', { revalidate: 600 }), // 10 min for featured
    serverApiFetch<Product>('/store/products/?ordering=-created_at&limit=4', { revalidate: 300 }), // 5 min for latest
    serverApiFetch<Product>('/store/products/?ordering=-total_likes&limit=4', { revalidate: 600 }), // 10 min for trending
    serverApiFetch<Collection>('/store/collections/', { revalidate: 1800 }), // 30 min for collections
  ]);

  // Extract data with fallbacks
  const heroProducts = heroResult.error ? [] : (heroResult.data as Product[]);
  const featuredProducts = featuredResult.error ? [] : (featuredResult.data as Product[]);
  const latestProducts = latestResult.error ? [] : (latestResult.data as Product[]);
  const trendingProducts = trendingResult.error ? [] : (trendingResult.data as Product[]);
  const collections = collectionsResult.error ? [] : (collectionsResult.data as Collection[]);

  const topCollections = collections.slice(0, 3);
  const collectionPreviewResults = await Promise.all(
    topCollections.map((c) =>
      serverApiFetch<Product>(`/store/products/?collection_id=${c.id}&limit=1`, {
        revalidate: 1800,
      })
    )
  );
  const collectionHeroImages = collectionPreviewResults.map((r) => {
    if (r.error || !r.data || !Array.isArray(r.data) || r.data.length === 0) return null;
    return r.data[0].images?.[0]?.image ?? null;
  });

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <Suspense fallback={<div className="h-[600px] bg-muted animate-pulse" />}>
        <Hero initialProducts={heroProducts} />
      </Suspense>
      
      {/* Social Proof / Trust Section */}
      <section className="py-12 border-y bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-3 justify-center">
               <Zap className="h-6 w-6 text-primary" />
               <span className="font-black uppercase tracking-tighter text-sm">Ultra Fast Delivery</span>
            </div>
            <div className="flex items-center gap-3 justify-center">
               <TrendingUp className="h-6 w-6 text-primary" />
               <span className="font-black uppercase tracking-tighter text-sm">Trending Styles</span>
            </div>
            <div className="flex items-center gap-3 justify-center">
               <ShieldCheck className="h-6 w-6 text-primary" />
               <span className="font-black uppercase tracking-tighter text-sm">Secure Checkout</span>
            </div>
            <div className="flex items-center gap-3 justify-center">
               <Zap className="h-6 w-6 text-primary" />
               <span className="font-black uppercase tracking-tighter text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="py-24 bg-cream/30 h-[400px] animate-pulse" />}>
        <FeaturedProducts products={featuredProducts} />
      </Suspense>

      <Suspense fallback={<div className="py-24 bg-background h-[400px] animate-pulse" />}>
        <LatestProducts products={latestProducts} />
      </Suspense>

      <Suspense fallback={<div className="py-24 bg-muted/30 h-[400px] animate-pulse" />}>
        <TrendingProducts products={trendingProducts} />
      </Suspense>

      
      {/* Category Grid */}
      <section className="py-24 bg-cream/20">
         <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
               {topCollections.length > 0 && (
                 <Link href={`/products?collection_id=${topCollections[0].id}`} className="group h-full relative overflow-hidden rounded-[40px] shadow-2xl">
                    {collectionHeroImages[0] ? (
                      <Image
                        fill
                        src={collectionHeroImages[0]}
                        alt={topCollections[0].title}
                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-muted to-background" aria-hidden />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-12">
                       <h3 className="text-5xl font-black text-white italic tracking-tighter uppercase mb-4">{topCollections[0].title}</h3>
                       <div className="flex items-center gap-2 text-primary font-bold">
                          SHOP NOW <ArrowRight className="h-5 w-5" />
                       </div>
                    </div>
                 </Link>
               )}
               <div className="grid grid-rows-2 gap-8 h-full">
                  {topCollections.length > 1 && (
                    <Link href={`/products?collection_id=${topCollections[1].id}`} className="group relative overflow-hidden rounded-[40px] shadow-2xl">
                       {collectionHeroImages[1] ? (
                         <Image
                           fill
                           src={collectionHeroImages[1]}
                           alt={topCollections[1].title}
                           className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                           referrerPolicy="no-referrer"
                           sizes="50vw"
                         />
                       ) : (
                         <div className="absolute inset-0 bg-gradient-to-br from-muted via-primary/30 to-background" aria-hidden />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                       <div className="absolute bottom-0 left-0 p-8">
                          <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">{topCollections[1].title}</h3>
                       </div>
                    </Link>
                  )}
                  {topCollections.length > 2 && (
                    <Link href={`/products?collection_id=${topCollections[2].id}`} className="group relative overflow-hidden rounded-[40px] shadow-2xl">
                       {collectionHeroImages[2] ? (
                         <Image
                           fill
                           src={collectionHeroImages[2]}
                           alt={topCollections[2].title}
                           className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                           referrerPolicy="no-referrer"
                           sizes="50vw"
                         />
                       ) : (
                         <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/40 to-muted" aria-hidden />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                       <div className="absolute bottom-0 left-0 p-8">
                          <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">{topCollections[2].title}</h3>
                       </div>
                    </Link>
                  )}
               </div>
            </div>
         </div>
      </section>


      <Footer />
    </main>
  );
}
