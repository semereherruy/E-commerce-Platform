'use client';

import React from 'react';
import HeroProductSlides from './HeroProductSlides';
import { Product } from '@/lib/types';
import { ShieldCheck, Truck, Sparkles, Zap, Box, Tag, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Hero({ initialProducts = [] }: { initialProducts?: Product[] }) {
  return (
    <section className="relative overflow-hidden bg-background pt-8 md:pt-12 lg:pt-16 pb-16">
      <div className="container mx-auto px-4">
        {/* Main Hero Container with 75/25 Split */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* 75% Side: The Main Showcase Slider */}
          <div className="lg:w-3/4 w-full flex-1 relative min-h-[500px] md:min-h-[600px] lg:h-auto overflow-hidden rounded-[48px] shadow-2xl shadow-primary/10 border-4 border-white bg-white">
            <HeroProductSlides products={initialProducts} />
          </div>

          {/* 25% Side: Quick Navigation Panel */}
          <div className="lg:w-1/4 w-full flex flex-col gap-6">
            <div className="flex-1 bg-black rounded-[40px] p-8 text-white relative overflow-hidden group border border-white/10 flex flex-col justify-between">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all duration-500" />
              
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-2">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-tight">
                  Quick <span className="text-primary">Access</span>
                </h3>
                <p className="text-sm font-medium text-white/60 leading-relaxed">
                  Navigate directly to our core departments and find your perfect fit faster.
                </p>
              </div>

              <div className="relative z-10 mt-8 space-y-4">
                {[
                  { icon: Box, text: 'All Products', sub: 'Browse everything', href: '/products' },
                  { icon: Tag, text: 'Collections', sub: 'Curated galleries', href: '/collections' },
                  { icon: TrendingUp, text: 'Trending Now', sub: 'Hottest drops', href: '/products?ordering=-total_likes' },
                  { icon: Sparkles, text: 'New Arrivals', sub: 'Just landed', href: '/products?ordering=-created_at' },
                ].map((item, i) => (
                  <Link key={i} href={item.href} className="flex items-center gap-4 group/item hover:bg-white/5 p-2 -m-2 rounded-2xl transition-all">
                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all shadow-lg shadow-black">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest transition-colors group-hover/item:text-primary">{item.text}</p>
                      <p className="text-[10px] font-bold text-white/40">{item.sub}</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-white/20 group-hover/item:text-primary transition-all" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Small Promotional Tag - Functional */}
            <Link href="/register" className="h-24 bg-primary rounded-[32px] p-6 flex items-center justify-between group cursor-pointer hover:bg-primary/90 transition-all shadow-xl shadow-primary/10">
              <div className="text-black">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Join the club</p>
                <p className="text-lg font-black uppercase tracking-tighter italic">Get 15% OFF</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-xl">
                <Zap className="h-5 w-5 fill-current" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
