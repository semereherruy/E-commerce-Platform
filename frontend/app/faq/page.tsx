'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Search, HelpCircle, Truck, RefreshCw, ShieldCheck, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';

const faqs = [
  {
    category: "Ordering",
    icon: HelpCircle,
    questions: [
      {
        q: "How do I place an order?",
        a: "Simply browse our catalog, select your items, size, and quantity, and click 'Add to Bag'. Once you're ready, proceed to checkout and follow the instructions."
      },
      {
        q: "Can I change my order after placing it?",
        a: "We process orders quickly to ensure fast delivery. You can change or cancel your order within 30 minutes of placing it by contacting our support team."
      }
    ]
  },
  {
    category: "Shipping & Delivery",
    icon: Truck,
    questions: [
      {
        q: "How long does shipping take?",
        a: "Domestic orders typically arrive within 3-5 business days. International orders can take 7-14 business days depending on the destination."
      },
      {
        q: "Do you offer free shipping?",
        a: "Yes! We offer free standard delivery on orders over 8,000 ETB subtotal. Below that, a flat delivery fee is shown at checkout before you pay."
      }
    ]
  },
  {
    category: "Returns & Exchanges",
    icon: RefreshCw,
    questions: [
      {
        q: "What is your return policy?",
        a: "We offer a 30-day return policy for most items. Items must be in their original condition with all tags attached."
      },
      {
        q: "How do I start a return?",
        a: "Log in to your account, go to 'Orders', select the order you want to return, and follow the instructions to print a return label."
      }
    ]
  },
  {
    category: "Payment & Security",
    icon: ShieldCheck,
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards, PayPal, Apple Pay, and Google Pay."
      },
      {
        q: "Is my payment information secure?",
        a: "Absolutely. We use industry-standard encryption and secure payment gateways to protect your information."
      }
    ]
  }
];

function FAQItem({ q, a }: { q: string, a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b last:border-0 border-primary/10">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-bold group-hover:text-primary transition-colors">{q}</span>
        <div className={`shrink-0 h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-muted-foreground leading-relaxed font-medium">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header Section */}
        <section className="bg-muted/40 py-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6">
              Frequently Asked <span className="text-primary italic">Questions</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium mb-12 max-w-2xl mx-auto">
              Everything you need to know about our products, shipping, and more. 
              Can&apos;t find what you&apos;re looking for? Reach out to us.
            </p>
            
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search for answers..." 
                className="h-16 pl-12 rounded-2xl border-2 shadow-xl bg-white text-lg font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-24 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Quick Contacts */}
            <div className="md:col-span-1 space-y-6">
              <div className="p-8 bg-primary text-primary-foreground rounded-[40px] shadow-2xl">
                <Mail className="h-10 w-10 mb-6 text-primary-foreground" />
                <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Still need help?</h3>
                <p className="text-sm opacity-90 font-medium mb-6 leading-tight">
                  Our team is available 24/7 to help you with any issues.
                </p>
                <div className="space-y-4 font-black text-xs uppercase tracking-widest">
                   <div className="flex flex-col">
                      <span className="opacity-60 text-[10px]">Email</span>
                      <span>support@nebi.store</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="opacity-60 text-[10px]">Phone</span>
                      <span>+1 (800) 555-NEBI</span>
                   </div>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div className="md:col-span-3">
              <div className="space-y-16">
                {faqs.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                          <cat.icon className="h-6 w-6" />
                       </div>
                       <h2 className="text-3xl font-black uppercase tracking-tighter">{cat.category}</h2>
                    </div>
                    <div className="divide-y divide-primary/10 bg-white/50 backdrop-blur-sm rounded-[40px] p-8 md:p-12 border shadow-sm">
                      {cat.questions.map((q) => (
                        <FAQItem key={q.q} q={q.q} a={q.a} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
