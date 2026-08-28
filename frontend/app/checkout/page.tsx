'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Truck, CreditCard, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/store';
import { isAdminRole } from '@/lib/roles';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-helpers';
import { formatEtb } from '@/lib/format-currency';
import { computeShippingEtb } from '@/lib/shipping';

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const user = useAuth((state) => state.user);
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [checkoutProgress, setCheckoutProgress] = useState(1); // 1: Shipping, 2: Payment

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const shipping = computeShippingEtb(subtotal);
  const total = subtotal + shipping;

  useEffect(() => {
    if (!user) {
      toast.info('Please login to complete checkout.');
      router.replace('/login?next=/checkout');
      return;
    }
    if (isAdminRole(user.role)) {
      router.replace('/admin/dashboard');
    }
  }, [user, router]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart?.items.length) {
      toast.error('Your cart is empty.');
      return;
    }

    // Move to payment step before processing
    setCheckoutProgress(2);
    
    setIsProcessing(true);

    try {
      const cartRes = await api.post('/store/carts/', {});
      const backendCartId = cartRes.data.id;

      for (const item of cart.items) {
        await api.post(`/store/carts/${backendCartId}/items/`, {
          product_id: item.product.id,
          quantity: item.quantity,
        });
      }

      const orderRes = await api.post('/store/orders/', { cart_id: backendCartId });
      clearCart();

      if (paymentMethod === 'chapa') {
        try {
          const payRes = await api.post('/store/payments/initiate/', {
            order_id: orderRes.data.id,
            return_url: window.location.origin + '/checkout/success'
          });
          window.location.href = payRes.data.checkout_url;
          return;
        } catch (err) {
          toast.error('Payment initialization failed, but order was created.');
          router.push(`/checkout/success?orderId=${orderRes.data.id}`);
          return;
        }
      }

      toast.success('Order placed successfully!');
      router.push(`/checkout/success?orderId=${orderRes.data.id}`);

    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Checkout failed. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-6xl mx-auto">
          <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-12 transition-colors group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            BACK TO BAG
          </Link>

          <div className="flex flex-col lg:flex-row gap-16">
            <div className="flex-grow space-y-12">
               <div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-4 italic">
                     Check<span className="text-primary italic">out</span>
                  </h1>
                  <p className="text-muted-foreground font-medium text-lg">Secure your gear and step into the future.</p>
               </div>

               {/* Progress Indicator */}
               <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${checkoutProgress >= 1 ? 'bg-foreground text-background' : 'bg-muted text-foreground/70'}`}>
                     1
                  </div>
                  <div className={`flex-grow h-1 transition-all ${checkoutProgress >= 2 ? 'bg-foreground' : 'bg-muted'}`} />
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${checkoutProgress >= 2 ? 'bg-foreground text-background' : 'bg-muted text-foreground/70'}`}>
                     2
                  </div>
               </div>

               <form onSubmit={handleCheckout} className="space-y-12">
                  {/* Shipping Info */}
                  <div className="space-y-8 p-10 bg-white rounded-[40px] shadow-xl border">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 bg-foreground/10 rounded-xl flex items-center justify-center text-foreground font-black">1</div>
                       <h2 className="text-3xl font-black uppercase tracking-tighter text-card-foreground">Shipping Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <Label className="font-bold uppercase text-xs tracking-widest text-foreground">First Name</Label>
                          <Input required className="h-14 border-2 rounded-2xl font-medium" />
                       </div>
                       <div className="space-y-3">
                          <Label className="font-bold uppercase text-xs tracking-widest text-foreground">Last Name</Label>
                          <Input required className="h-14 border-2 rounded-2xl font-medium" />
                       </div>
                       <div className="space-y-3 md:col-span-2">
                          <Label className="font-bold uppercase text-xs tracking-widest text-foreground">Address Line 1</Label>
                          <Input required className="h-14 border-2 rounded-2xl font-medium" />
                       </div>
                       <div className="space-y-3">
                          <Label className="font-bold uppercase text-xs tracking-widest text-foreground">City</Label>
                          <Input required className="h-14 border-2 rounded-2xl font-medium" />
                       </div>
                       <div className="space-y-3">
                          <Label className="font-bold uppercase text-xs tracking-widest text-foreground">Postal Code</Label>
                          <Input required className="h-14 border-2 rounded-2xl font-medium" />
                       </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-8 p-10 bg-white rounded-[40px] shadow-xl border">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black">2</div>
                       <h2 className="text-3xl font-black uppercase tracking-tighter">Payment Method</h2>
                    </div>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                          <RadioGroupItem value="card" id="card" className="peer sr-only" />
                          <Label 
                            htmlFor="card" 
                            className="flex flex-col items-center justify-between rounded-[24px] border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all cursor-pointer h-full"
                          >
                            <CreditCard className="mb-3 h-8 w-8 text-primary" />
                            <span className="font-black uppercase tracking-widest text-[10px]">Credit Card</span>
                          </Label>
                       </div>
                       <div>
                          <RadioGroupItem value="chapa" id="chapa" className="peer sr-only" />
                          <Label 
                            htmlFor="chapa" 
                            className="flex flex-col items-center justify-between rounded-[24px] border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all cursor-pointer h-full"
                          >
                            <div className="mb-3 h-8 flex items-center justify-center">
                              <span className="text-xl font-black text-primary">CHAPA</span>
                            </div>
                            <span className="font-black uppercase tracking-widest text-[10px]">Chapa / Local</span>
                          </Label>
                       </div>
                       <div>
                          <RadioGroupItem value="paypal" id="paypal" className="peer sr-only" />
                          <Label 
                            htmlFor="paypal" 
                            className="flex flex-col items-center justify-between rounded-[24px] border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all cursor-pointer h-full"
                          >
                            <Image src="https://picsum.photos/seed/paypal/40/40" alt="PayPal" width={32} height={32} className="mb-3 grayscale" referrerPolicy="no-referrer" />
                            <span className="font-black uppercase tracking-widest text-[10px]">PayPal</span>
                          </Label>
                       </div>
                    </RadioGroup>

                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                       <div className="space-y-3 md:col-span-2">
                          <Label className="font-bold uppercase text-xs tracking-widest text-primary">Card Number</Label>
                          <Input placeholder="0000 0000 0000 0000" className="h-14 border-2 rounded-2xl font-medium" />
                       </div>
                       <div className="space-y-3">
                          <Label className="font-bold uppercase text-xs tracking-widest text-primary">Expiry Date</Label>
                          <Input placeholder="MM/YY" className="h-14 border-2 rounded-2xl font-medium" />
                       </div>
                       <div className="space-y-3">
                          <Label className="font-bold uppercase text-xs tracking-widest text-primary">CVV</Label>
                          <Input placeholder="***" className="h-14 border-2 rounded-2xl font-medium" />
                       </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={isProcessing} className="w-full h-20 text-xl font-black shadow-2xl rounded-[30px] flex items-center justify-center gap-4 italic uppercase">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Purchase — {formatEtb(total)}
                        <ShieldCheck className="h-6 w-6" />
                      </>
                    )}
                  </Button>
               </form>
            </div>

            {/* Summary */}
            <aside className="lg:w-[400px]">
              <div className="sticky top-24 space-y-6">
                 <Card className="border-none shadow-2xl rounded-[40px] bg-white overflow-hidden">
                    <CardHeader className="bg-muted/30 p-8 border-b">
                       <CardTitle className="text-xl font-black uppercase tracking-tighter italic">Review Order</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                       <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                          {cart?.items.map((item) => (
                             <div key={item.product.id} className="flex gap-4">
                                <div className="h-16 w-16 rounded-xl bg-muted border shrink-0 relative overflow-hidden">
                                   <Image src={item.product.images[0]?.image} alt={item.product.title} fill className="object-cover" referrerPolicy="no-referrer" sizes="64px" />
                                </div>
                                <div className="flex-grow flex flex-col justify-center">
                                   <h4 className="text-xs font-black uppercase leading-tight line-clamp-1">{item.product.title}</h4>
                                   <p className="text-[10px] text-muted-foreground font-bold">QTY: {item.quantity}</p>
                                   <span className="font-black text-xs text-primary mt-1">{formatEtb(item.total_price)}</span>
                                </div>
                             </div>
                          ))}
                       </div>

                       <Separator />

                       <div className="space-y-3">
                          <div className="flex justify-between font-bold">
                             <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Subtotal</span>
                             <span className="text-sm">{formatEtb(subtotal)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                             <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Shipping</span>
                             <span className="text-sm">{shipping === 0 ? 'FREE' : formatEtb(shipping)}</span>
                          </div>
                          <div className="flex justify-between items-baseline pt-4 border-t-2 border-dashed border-muted mt-4">
                             <span className="text-sm font-black uppercase tracking-widest">Total</span>
                             <span className="text-3xl font-black text-primary italic tracking-tighter">{formatEtb(total)}</span>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
                 
                 <div className="p-6 bg-cream/50 rounded-3xl border text-center space-y-2">
                    <Truck className="h-6 w-6 text-primary mx-auto mb-2" />
                    <h4 className="font-black uppercase tracking-widest text-[10px] text-primary">Delivery Guarantee</h4>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight">Your order will be shipped within 24 hours of confirmation.</p>
                 </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
