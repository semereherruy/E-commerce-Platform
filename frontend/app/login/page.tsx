'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, LogIn, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { getPostLoginPath, setAuthCookies } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api-helpers';
import { validateEmail, validatePassword } from '@/lib/validation';

type Errors = { email?: string; password?: string };
type Touched = { email?: boolean; password?: boolean };

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 font-semibold mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {error}
    </p>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuth((state) => state.setUser);

  const runValidations = (mail: string, pass: string): Errors => ({
    email: validateEmail(mail) ?? undefined,
    password: validatePassword(pass) ?? undefined,
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setErrors(prev => ({ ...prev, email: validateEmail(value) ?? undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      setErrors(prev => ({ ...prev, password: validatePassword(value) ?? undefined }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: validateEmail(email) ?? undefined }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    setErrors(prev => ({ ...prev, password: validatePassword(password) ?? undefined }));
  };

  const isEmailOk = () => touched.email && !errors.email && email.trim().length > 0;
  const isPasswordOk = () => touched.password && !errors.password && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const all = runValidations(email, password);
    setTouched({ email: true, password: true });
    setErrors(all);

    if (all.email || all.password) {
      toast.error('Please fix the errors below before submitting.');
      return;
    }

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
      const nextParam = new URLSearchParams(window.location.search).get('next');
      router.push(getPostLoginPath(userRes.data.role, nextParam));
    } catch (error: unknown) {
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-foreground/70 hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            BACK TO STORE
          </Link>

          <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl">
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-4">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-4xl font-black tracking-tighter uppercase">
                Welcome <span className="text-primary italic">Back</span>
              </CardTitle>
              <CardDescription className="text-base font-medium">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit} noValidate>
              <CardContent className="grid grid-cols-1 gap-5">
                <div className="space-y-1">
                  <Label htmlFor="email" className="font-bold uppercase text-xs tracking-widest text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className={`h-12 border-2 pr-9 ${errors.email && touched.email ? 'border-red-400 focus-visible:ring-red-400' : isEmailOk() ? 'border-emerald-400' : ''}`}
                      value={email}
                      onChange={handleEmailChange}
                      onBlur={handleEmailBlur}
                      disabled={isLoading}
                    />
                    {isEmailOk() && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                  </div>
                  <FieldError error={touched.email ? errors.email : undefined} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-bold uppercase text-xs tracking-widest text-foreground">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-xs font-bold text-foreground/60 hover:text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={`h-12 border-2 pr-10 ${errors.password && touched.password ? 'border-red-400 focus-visible:ring-red-400' : isPasswordOk() ? 'border-emerald-400' : ''}`}
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      disabled={isLoading}
                    />
                    {isPasswordOk() && <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError error={touched.password ? errors.password : undefined} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-4">
                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Logging In...
                    </>
                  ) : (
                    'LOGIN'
                  )}
                </Button>
                <p className="text-sm text-center text-foreground/70 font-medium">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="text-primary font-bold hover:underline">Register</Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
