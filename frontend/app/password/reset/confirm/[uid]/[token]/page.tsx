'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-helpers';

interface PageProps {
  params: Promise<{
    uid: string;
    token: string;
  }>;
}

export default function PasswordResetConfirmPage({ params }: PageProps) {
  const { uid, token: rawToken } = use(params);
  const token = rawToken.replace(/=\r?\n/g, '').replace(/=/g, '');
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState('');
  const [reNewPassword, setReNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== reNewPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    console.log('Attempting password reset with:', { uid, token });

    try {
      await api.post('/auth/users/reset_password_confirm/', {
        uid,
        token,
        new_password: newPassword,
        re_new_password: reNewPassword,
      });
      setIsSuccess(true);
      toast.success('Password has been reset successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error detailed:', error.response?.data || error.message);
      const data = error.response?.data;
      let detailedMessage = '';
      if (data && typeof data === 'object') {
        detailedMessage = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val[0] : val}`)
          .join(' | ');
      }
      toast.error(detailedMessage || 'Failed to reset password. The link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-20">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 opacity-30" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 opacity-30" />
      </div>

      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          BACK TO LOGIN
        </Link>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-[40px] p-4 text-center overflow-hidden">
          <CardHeader className="space-y-4 pb-8">
            <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
              {isSuccess ? <CheckCircle2 className="h-8 w-8" /> : <KeyRound className="h-8 w-8" />}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black tracking-tighter uppercase italic">
                {isSuccess ? 'Success!' : 'Set New Password'}
              </CardTitle>
              <CardDescription className="text-sm font-semibold max-w-xs mx-auto">
                {isSuccess 
                  ? "Your password has been updated. Redirecting you to login..." 
                  : "Please enter your new password below to regain access to your account."}
              </CardDescription>
            </div>
          </CardHeader>
          
          {!isSuccess && (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="new_password" className="font-bold uppercase text-[10px] tracking-widest text-primary ml-2">New Password</Label>
                  <Input 
                    id="new_password" 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    className="h-14 border-2 rounded-2xl font-medium focus-visible:ring-primary bg-white/50"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="re_new_password" className="font-bold uppercase text-[10px] tracking-widest text-primary ml-2">Confirm New Password</Label>
                  <Input 
                    id="re_new_password" 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    className="h-14 border-2 rounded-2xl font-medium focus-visible:ring-primary bg-white/50"
                    value={reNewPassword}
                    onChange={(e) => setReNewPassword(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-4">
                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl rounded-2xl uppercase italic group relative overflow-hidden" disabled={isLoading}>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'RESET PASSWORD'}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </CardFooter>
            </form>
          )}
          
          {isSuccess && (
            <CardFooter className="pt-4">
              <Button className="w-full h-14 text-lg font-black shadow-xl rounded-2xl uppercase italic" nativeButton={false} render={<Link href="/login" />}>
                LOGIN NOW
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
