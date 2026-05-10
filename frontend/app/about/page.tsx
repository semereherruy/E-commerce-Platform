import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Globe, Recycle, Award } from 'lucide-react';

export const metadata = {
  title: 'About Us | Nebi Store',
  description: 'Learn about Nebi Store - premium performance gear and urban streetwear for the modern individual.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.8] mb-8">
                We Build <br />
                <span className="text-white italic">The Standard</span> <br />
                Of Urban Gear.
              </h1>
              <p className="text-xl md:text-2xl opacity-90 max-w-2xl font-medium leading-relaxed">
                Founded in 2026, Nebi Store is more than just an e-commerce platform. 
                We are a hub for performance-driven individuals who demand style without compromise.
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full hidden lg:block opacity-20">
             <Image 
                src="https://picsum.photos/seed/about-hero/1200/800" 
                alt="Architecture" 
                fill 
                className="object-cover"
                sizes="50vw"
             />
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative h-[500px] rounded-[60px] overflow-hidden shadow-2xl">
              <Image 
                src="https://picsum.photos/seed/about1/800/800" 
                alt="Mission" 
                fill 
                className="object-cover"
                referrerPolicy="no-referrer"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">Our <span className="text-primary italic">Mission</span></h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our mission is to empower athletes and urban explorers with apparel that adapts to their lifestyle. 
                We believe that technology should be wearable, and style should be functional.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-3xl shadow-sm border space-y-3">
                  <Globe className="h-8 w-8 text-primary" />
                  <h4 className="font-bold uppercase tracking-widest text-sm text-primary">Global Reach</h4>
                  <p className="text-xs text-muted-foreground font-medium">Shipping to over 150 countries with verified logistics.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl shadow-sm border space-y-3">
                  <Recycle className="h-8 w-8 text-primary" />
                  <h4 className="font-bold uppercase tracking-widest text-sm text-primary">Sustainability</h4>
                  <p className="text-xs text-muted-foreground font-medium">Committed to using 80% recycled materials by 2028.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl shadow-sm border space-y-3">
                  <Users className="h-8 w-8 text-primary" />
                  <h4 className="font-bold uppercase tracking-widest text-sm text-primary">Community</h4>
                  <p className="text-xs text-muted-foreground font-medium">Over 1M+ active members worldwide in our drops program.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl shadow-sm border space-y-3">
                  <Award className="h-8 w-8 text-primary" />
                  <h4 className="font-bold uppercase tracking-widest text-sm text-primary">Quality First</h4>
                  <p className="text-xs text-muted-foreground font-medium">Every piece is tested in extreme urban environments.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-cream/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-8">Ready to <span className="text-primary italic">Join us?</span></h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="h-16 px-10 text-lg font-black rounded-2xl shadow-xl" nativeButton={false} render={<Link href="/products" />}>
                SHOP THE COLLECTION
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 text-lg font-black rounded-2xl border-2" nativeButton={false} render={<Link href="/register" />}>
                CREATE ACCOUNT
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
