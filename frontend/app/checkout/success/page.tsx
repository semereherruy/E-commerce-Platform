'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, ArrowRight, Home } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

export default function SuccessPage() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const { orderId, txRef } = useMemo(() => {
    if (typeof window === 'undefined') return { orderId: null, txRef: null };
    const params = new URLSearchParams(window.location.search);
    return {
      orderId: params.get('orderId'),
      txRef: params.get('tx_ref')
    };
  }, []);

  useEffect(() => {
    if (txRef) {
      const verifyPayment = async () => {
        setIsVerifying(true);
        try {
          await api.post('/store/payments/verify/', { tx_ref: txRef });
          setPaymentStatus('success');
          toast.success('Payment verified successfully!');
        } catch (error) {
          setPaymentStatus('failed');
          toast.error('Payment verification failed.');
        } finally {
          setIsVerifying(false);
        }
      };
      verifyPayment();
    }
  }, [txRef]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center container mx-auto px-4 py-24">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
            />
            <CheckCircle2 className="h-24 w-24 text-primary relative z-10" />
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">
              Order <span className="text-primary italic">Confirmed</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-lg mx-auto">
              Thank you for your purchase! Your order is being processed and will be shipped shortly.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-primary/10 inline-block w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Order Number</span>
              <span className="text-lg font-black text-primary">{orderId ? `#${orderId}` : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</span>
              <span className={`text-sm font-black uppercase italic ${
                paymentStatus === 'success' ? 'text-green-600' : 
                paymentStatus === 'failed' ? 'text-red-600' : 'text-primary'
              }`}>
                {isVerifying ? 'Verifying...' : 
                 paymentStatus === 'success' ? 'Paid & Verified' :
                 paymentStatus === 'failed' ? 'Verification Failed' : 'Processing'}
              </span>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button size="lg" className="h-16 px-8 text-lg font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground group" nativeButton={false} render={<Link href="/profile" />}>
              <Package className="mr-2 h-5 w-5" />
              TRACK MY ORDER
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" className="h-16 px-8 text-lg font-bold border-2" nativeButton={false} render={<Link href="/" />}>
              <Home className="mr-2 h-5 w-5" />
              BACK TO HOME
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground font-medium">
            A confirmation email has been sent to your registered address.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
