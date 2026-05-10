'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle, Clock, ChevronRight, ShoppingBag, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { extractList, getApiErrorMessage } from '@/lib/api-helpers';
import { formatEtb } from '@/lib/format-currency';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface OrderItem {
  id: number;
  product: {
    id: number;
    title: string;
    unit_price: number;
    image?: string;
  };
  quantity: number;
  total_price: number;
}

interface Order {
  id: number;
  placed_at: string;
  payment_status: 'P' | 'C' | 'F';
  items: OrderItem[];
  total_price: number;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login?next=/orders');
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/store/orders/');
        setOrders(extractList(response.data));
      } catch (error: any) {
        setOrders([]);
        toast.error(getApiErrorMessage(error, 'Unable to load orders right now.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, router]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'C': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-black tracking-widest uppercase text-[10px]">Completed</Badge>;
      case 'P': return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-black tracking-widest uppercase text-[10px]">Pending</Badge>;
      case 'F': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-black tracking-widest uppercase text-[10px]">Failed</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
             <div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-2">Order <span className="text-primary italic">History</span></h1>
                <p className="text-muted-foreground font-medium text-lg">Track your shipments and view past purchases.</p>
             </div>
             <Button variant="outline" className="rounded-2xl h-12 font-bold border-2" nativeButton={false} render={<Link href="/products" />}>
                CONTINUE SHOPPING
             </Button>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 rounded-[40px] bg-muted animate-pulse" />
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-8">
              {orders.map((order) => (
                <Card key={order.id} className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-8 md:p-10 flex-grow">
                      <div className="flex flex-wrap items-center gap-4 mb-8">
                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                          <Package className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order ID</span>
                          <span className="font-black text-xl italic">NEBI-#{order.id}</span>
                        </div>
                        <div className="md:ml-auto flex items-center gap-4">
                          {getStatusBadge(order.payment_status)}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Placed On</span>
                            <span className="font-bold text-sm">{new Date(order.placed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 group/item">
                            <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-muted border shrink-0">
                               <Image
                                  src={item.product.image || `https://picsum.photos/seed/order-${item.product.id}/200/200`}
                                  alt={item.product.title}
                                  fill 
                                  className="object-cover" 
                                  referrerPolicy="no-referrer"
                                  sizes="80px"
                               />
                            </div>
                            <div className="flex-grow">
                              <h4 className="font-black uppercase tracking-tight text-sm group-hover/item:text-primary transition-colors">{item.product.title}</h4>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                               <span className="font-black text-lg text-primary">{formatEtb(Number(item.total_price))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 md:w-80 border-l p-8 md:p-10 flex flex-col justify-between">
                       <div className="space-y-6">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Shipping Update</span>
                             <div className="flex items-center gap-2 text-green-500">
                                <Truck className="h-5 w-5" />
                                <span className="font-bold text-sm">Arriving in 2-3 days</span>
                             </div>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Amount</span>
                             <span className="text-3xl font-black italic tracking-tighter text-primary">{formatEtb(order.total_price)}</span>
                          </div>
                       </div>
                       
                       <Button className="w-full h-14 rounded-2xl font-black shadow-lg uppercase mt-8 group">
                          Track Order
                          <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                       </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-white/50 backdrop-blur-xl rounded-[60px] shadow-2xl border-2 border-dashed">
              <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center mb-8">
                 <ShoppingBag className="h-16 w-16 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 italic">No orders yet</h2>
              <p className="text-muted-foreground max-w-sm mb-12 font-medium">Your gear is waiting for you. Level up your style with our latest collection.</p>
              <Button size="lg" className="h-16 px-12 font-black rounded-3xl shadow-xl italic uppercase" nativeButton={false} render={<Link href="/products" />}>
                 Explore Shop
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
