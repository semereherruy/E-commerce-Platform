'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-helpers';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/auth/users/reset_password/', { email });
      setIsSent(true);
      toast.success('Reset link sent to your email!');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Password reset is not available right now.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-20">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 opacity-30" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 opacity-30" />
      </div>

      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          BACK TO LOGIN
        </Link>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-[40px] p-4 text-center">
          <CardHeader className="space-y-4 pb-8">
            <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
              {isSent ? <CheckCircle2 className="h-8 w-8" /> : <Mail className="h-8 w-8" />}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black tracking-tighter uppercase italic">
                {isSent ? 'Link Sent' : 'Forgot Password?'}
              </CardTitle>
              <CardDescription className="text-sm font-semibold max-w-xs mx-auto">
                {isSent 
                  ? `We've sent a recovery link to ${email}. Please check your inbox and spam folder.` 
                  : "Enter the email address associated with your account and we'll send you a link to reset your password."}
              </CardDescription>
            </div>
          </CardHeader>
          
          {!isSent ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="email" className="font-bold uppercase text-xs tracking-widest text-primary ml-2">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    required 
                    className="h-14 border-2 rounded-2xl font-medium focus-visible:ring-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-4">
                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl rounded-2xl uppercase italic" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'SEND RESET LINK'}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardFooter className="flex flex-col gap-4 pt-4">
               <Button variant="ghost" onClick={() => setIsSent(false)} className="w-full h-12 font-bold hover:bg-primary/5 transition-colors">
                  Didn&apos;t receive it? Resend
               </Button>
               <Button className="w-full h-14 text-lg font-black shadow-xl rounded-2xl uppercase italic" nativeButton={false} render={<Link href="/login" />}>
                  BACK TO LOGIN
               </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
