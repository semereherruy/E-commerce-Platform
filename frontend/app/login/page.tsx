'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { sanitizeNextPath, setAuthCookies } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api-helpers';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuth((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Get JWT Tokens
      const tokenRes = await api.post('/auth/jwt/create/', { email, password });
      const { access, refresh } = tokenRes.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // 2. Get User Info
      // Note: We need the JWT in the header for this, which our interceptor will now pick up
      const userRes = await api.get('/auth/users/me/', {
        headers: { Authorization: `JWT ${access}` }
      });
      
      setUser(userRes.data);
      setAuthCookies(access, refresh, userRes.data.role);
      
      toast.success('Login successful!');
      const nextPath = sanitizeNextPath(new URLSearchParams(window.location.search).get('next'));
      router.push(nextPath);
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Login failed:', error);
      }
      toast.error(getApiErrorMessage(error, 'Invalid email or password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          BACK TO STORE
        </Link>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-8 text-center">
            <CardTitle className="text-4xl font-black tracking-tighter uppercase">Welcome <span className="text-primary italic">Back</span></CardTitle>
            <CardDescription className="text-base font-medium">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold uppercase text-xs tracking-widest text-primary">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  className="h-12 border-2 focus-visible:ring-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-bold uppercase text-xs tracking-widest text-primary">Password</Label>
                  <Link href="/forgot-password" className="text-xs font-bold hover:underline">Forgot password?</Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  className="h-12 border-2 focus-visible:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'LOGIN'}
              </Button>
              <p className="text-sm text-center text-muted-foreground font-medium">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary font-bold hover:underline">Register</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
