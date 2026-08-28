'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-helpers';
import {
  validateName,
  validateUsername,
  validateEmail,
  validatePhone,
  validatePassword,
} from '@/lib/validation';

interface FormData {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

type Errors = Partial<Record<keyof FormData, string>>;
type Touched = Partial<Record<keyof FormData, boolean>>;

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 font-semibold mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {error}
    </p>
  );
}

function FieldOk({ show }: { show: boolean }) {
  if (!show) return null;
  return <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />;
}

function runValidations(formData: FormData): Errors {
  return {
    first_name: validateName(formData.first_name) ?? undefined,
    last_name: validateName(formData.last_name) ?? undefined,
    username: validateUsername(formData.username) ?? undefined,
    email: validateEmail(formData.email) ?? undefined,
    phone: validatePhone(formData.phone) ?? undefined,
    password: validatePassword(formData.password) ?? undefined,
  };
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const key = id as keyof FormData;
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    if (touched[key]) {
      const all = runValidations(updated);
      setErrors(prev => ({ ...prev, [key]: all[key] }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const key = e.target.id as keyof FormData;
    setTouched(prev => ({ ...prev, [key]: true }));
    const all = runValidations(formData);
    setErrors(prev => ({ ...prev, [key]: all[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched and validate
    const allTouched: Touched = Object.fromEntries(
      Object.keys(formData).map(k => [k, true])
    ) as Touched;
    setTouched(allTouched);
    const all = runValidations(formData);
    setErrors(all);

    const hasErrors = Object.values(all).some(Boolean);
    if (hasErrors) {
      toast.error('Please fix the errors below before submitting.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
      };
      // Only send phone if provided (it goes to customer profile, not user)
      await api.post('/auth/users/', payload);
      toast.success('Account created! Please log in.');
      router.push('/login');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const f = (key: keyof FormData) => ({
    id: key,
    value: formData[key],
    onChange: handleChange,
    onBlur: handleBlur,
  });

  const isOk = (key: keyof FormData): boolean => !!(touched[key] && !errors[key] && formData[key].length > 0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-20">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary rounded-full blur-[100px] translate-y-1/2 translate-x-1/2" />
      </div>

      <div className="w-full max-w-lg">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          BACK TO STORE
        </Link>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-4">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-4xl font-black tracking-tighter uppercase">
              Create <span className="text-primary italic">Account</span>
            </CardTitle>
            <CardDescription className="text-base font-medium">
              Join the Nebi Store community today.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* First Name */}
              <div className="space-y-1">
                <Label htmlFor="first_name" className="font-bold uppercase text-xs tracking-widest text-foreground">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    {...f('first_name')}
                    placeholder="John"
                    className={`h-12 border-2 pr-9 ${errors.first_name && touched.first_name ? 'border-red-400 focus-visible:ring-red-400' : isOk('first_name') ? 'border-emerald-400' : ''}`}
                  />
                  <FieldOk show={isOk('first_name')} />
                </div>
                <FieldError error={touched.first_name ? errors.first_name : undefined} />
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <Label htmlFor="last_name" className="font-bold uppercase text-xs tracking-widest text-foreground">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    {...f('last_name')}
                    placeholder="Doe"
                    className={`h-12 border-2 pr-9 ${errors.last_name && touched.last_name ? 'border-red-400 focus-visible:ring-red-400' : isOk('last_name') ? 'border-emerald-400' : ''}`}
                  />
                  <FieldOk show={isOk('last_name')} />
                </div>
                <FieldError error={touched.last_name ? errors.last_name : undefined} />
              </div>

              {/* Username */}
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="username" className="font-bold uppercase text-xs tracking-widest text-foreground">
                  Username <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    {...f('username')}
                    placeholder="johndoe123"
                    className={`h-12 border-2 pr-9 ${errors.username && touched.username ? 'border-red-400 focus-visible:ring-red-400' : isOk('username') ? 'border-emerald-400' : ''}`}
                  />
                  <FieldOk show={isOk('username')} />
                </div>
                <FieldError error={touched.username ? errors.username : undefined} />
              </div>

              {/* Email */}
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="email" className="font-bold uppercase text-xs tracking-widest text-foreground">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    {...f('email')}
                    type="email"
                    placeholder="name@example.com"
                    className={`h-12 border-2 pr-9 ${errors.email && touched.email ? 'border-red-400 focus-visible:ring-red-400' : isOk('email') ? 'border-emerald-400' : ''}`}
                  />
                  <FieldOk show={isOk('email')} />
                </div>
                <FieldError error={touched.email ? errors.email : undefined} />
              </div>

              {/* Phone */}
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="phone" className="font-bold uppercase text-xs tracking-widest text-foreground">
                  Phone Number <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                </Label>
                <div className="relative">
                  <Input
                    {...f('phone')}
                    type="tel"
                    placeholder="+251912345678"
                    className={`h-12 border-2 pr-9 ${errors.phone && touched.phone ? 'border-red-400 focus-visible:ring-red-400' : isOk('phone') ? 'border-emerald-400' : ''}`}
                  />
                  <FieldOk show={isOk('phone')} />
                </div>
                <FieldError error={touched.phone ? errors.phone : undefined} />
                <p className="text-[10px] text-muted-foreground font-medium ml-1">
                  Ethiopian format: +251 followed by 9 or 7 then 8 digits
                </p>
              </div>

              {/* Password */}
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="password" className="font-bold uppercase text-xs tracking-widest text-foreground">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    {...f('password')}
                    type="password"
                    placeholder="Min. 8 chars with letters and numbers"
                    className={`h-12 border-2 pr-9 ${errors.password && touched.password ? 'border-red-400 focus-visible:ring-red-400' : isOk('password') ? 'border-emerald-400' : ''}`}
                  />
                  <FieldOk show={isOk('password')} />
                </div>
                <FieldError error={touched.password ? errors.password : undefined} />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'REGISTER NOW'
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground font-medium">
                Already have an account?{' '}
                <Link href="/login" className="text-primary font-bold hover:underline">Login</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
