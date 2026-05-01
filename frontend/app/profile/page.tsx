'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  User, Mail, Shield, LogOut, Package, Settings, CreditCard,
  Trash2, AlertTriangle, Phone, Calendar, Crown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-helpers';
import { validatePhone } from '@/lib/validation';
import { Badge } from '@/components/ui/badge';

const MEMBERSHIP_LABELS: Record<string, { label: string; color: string }> = {
  B: { label: 'Bronze', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  S: { label: 'Silver', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  G: { label: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
};

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'delete'>('account');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
  });
  const [customerData, setCustomerData] = useState({
    phone: '',
    birth_date: '',
    membership: 'B',
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      username: user.username || '',
    });
    const fetchCustomer = async () => {
      try {
        const response = await api.get('/store/customers/me/');
        setCustomerData({
          phone: response.data.phone || '',
          birth_date: response.data.birth_date
            ? response.data.birth_date.toString().slice(0, 10)
            : '',
          membership: response.data.membership || 'B',
        });
      } catch {
        // Keep defaults if profile unavailable
      }
    };
    fetchCustomer();
  }, [user, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneErr = validatePhone(customerData.phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }
    setPhoneError(null);
    setIsSaving(true);
    try {
      const payload: { phone: string; birth_date?: string } = {
        phone: customerData.phone,
      };
      if (customerData.birth_date) {
        payload.birth_date = customerData.birth_date;
      }
      await api.put('/store/customers/me/', payload);
      setUser({ ...user!, first_name: formData.first_name, last_name: formData.last_name });
      toast.success('Profile updated successfully.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Unable to save profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }
    if (!deletePassword) {
      toast.error('Please enter your current password.');
      return;
    }
    setIsDeleting(true);
    try {
      // Djoser requires current_password in body for account deletion
      await api.delete('/auth/users/me/', {
        data: { current_password: deletePassword },
      });
      logout();
      toast.success('Your account has been permanently deleted.');
      router.push('/');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to delete account. Check your password.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  if (!user) return null;

  const mem = MEMBERSHIP_LABELS[customerData.membership] ?? MEMBERSHIP_LABELS.B;

  const sidebarItems = [
    { key: 'account', label: 'Account Details', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12">
            {/* Sidebar */}
            <div className="w-full md:w-80 shrink-0 space-y-4">
              <div className="p-8 bg-white rounded-[40px] shadow-xl border overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="flex flex-col items-center text-center">
                  <div className="h-24 w-24 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-4xl font-black mb-4">
                    {user.first_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight mt-2">
                    {user.first_name} {user.last_name}
                  </h2>
                  <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1">
                    @{user.username}
                  </p>
                  <Badge className={`mt-3 border font-bold uppercase text-xs tracking-widest ${mem.color}`}>
                    <Crown className="h-3 w-3 mr-1" />
                    {mem.label} Member
                  </Badge>
                </div>
              </div>

              <div className="bg-white rounded-[40px] shadow-sm border p-4 space-y-1">
                {sidebarItems.map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    onClick={() => setActiveTab(key as typeof activeTab)}
                    className={`w-full justify-start h-14 rounded-2xl font-bold hover:bg-muted ${activeTab === key ? 'bg-primary/5 text-primary' : ''}`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  onClick={() => router.push('/orders')}
                  className="w-full justify-start h-14 rounded-2xl font-bold hover:bg-muted"
                >
                  <Package className="mr-3 h-5 w-5" />
                  Order History
                </Button>
                <Button variant="ghost" className="w-full justify-start h-14 rounded-2xl font-bold hover:bg-muted">
                  <CreditCard className="mr-3 h-5 w-5" />
                  Payments
                </Button>
                <Button variant="ghost" className="w-full justify-start h-14 rounded-2xl font-bold hover:bg-muted">
                  <Settings className="mr-3 h-5 w-5" />
                  Security
                </Button>
                <div className="pt-4 mt-4 border-t space-y-1">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab('delete')}
                    className={`w-full justify-start h-14 rounded-2xl font-bold hover:bg-destructive/10 hover:text-destructive ${activeTab === 'delete' ? 'bg-destructive/5 text-destructive' : 'text-muted-foreground'}`}
                  >
                    <Trash2 className="mr-3 h-5 w-5" />
                    Delete Account
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start h-14 rounded-2xl font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow space-y-8">
              <div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-2">
                  My <span className="text-primary italic">Profile</span>
                </h1>
                <p className="text-muted-foreground font-medium text-lg">
                  Manage your personal information and account settings.
                </p>
              </div>

              {/* Account Details Tab */}
              {activeTab === 'account' && (
                <Card className="border-none shadow-2xl rounded-[40px] bg-white overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b p-10">
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Personal Information</CardTitle>
                    <CardDescription className="text-md font-medium">
                      Update your phone number, birth date, and more.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-10">
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-8" onSubmit={handleSave}>
                      {/* Read-only user fields */}
                      <div className="space-y-3">
                        <Label className="font-bold uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <User className="h-3 w-3" /> First Name
                        </Label>
                        <Input
                          value={formData.first_name}
                          disabled
                          className="h-14 border-2 rounded-2xl font-medium bg-muted"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-bold uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <User className="h-3 w-3" /> Last Name
                        </Label>
                        <Input
                          value={formData.last_name}
                          disabled
                          className="h-14 border-2 rounded-2xl font-medium bg-muted"
                        />
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <Label className="font-bold uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <Mail className="h-3 w-3" /> Email Address
                        </Label>
                        <Input
                          disabled
                          value={formData.email}
                          className="h-14 border-2 rounded-2xl bg-muted font-medium"
                        />
                        <p className="text-[10px] text-muted-foreground font-bold italic ml-2">
                          Email cannot be changed manually. Contact support for assistance.
                        </p>
                      </div>

                      {/* Editable phone */}
                      <div className="space-y-3 md:col-span-2">
                        <Label className="font-bold uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <Phone className="h-3 w-3" /> Phone Number
                        </Label>
                        <Input
                          value={customerData.phone}
                          onChange={(e) => {
                            setCustomerData({ ...customerData, phone: e.target.value });
                            setPhoneError(null);
                          }}
                          onBlur={() => setPhoneError(validatePhone(customerData.phone))}
                          placeholder="+251912345678"
                          type="tel"
                          className={`h-14 border-2 rounded-2xl font-medium ${phoneError ? 'border-red-400' : ''}`}
                        />
                        {phoneError && (
                          <p className="text-xs text-red-600 font-semibold ml-1">{phoneError}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-medium ml-1">
                          Ethiopian format: +251 followed by 9 or 7 then 8 digits
                        </p>
                      </div>

                      {/* Birth date */}
                      <div className="space-y-3 md:col-span-2">
                        <Label className="font-bold uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> Date of Birth
                        </Label>
                        <Input
                          type="date"
                          value={customerData.birth_date}
                          onChange={(e) => setCustomerData({ ...customerData, birth_date: e.target.value })}
                          className="h-14 border-2 rounded-2xl font-medium"
                          max={new Date().toISOString().slice(0, 10)}
                        />
                      </div>

                      {/* Role */}
                      <div className="space-y-3 md:col-span-2">
                        <Label className="font-bold uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                          <Shield className="h-3 w-3" /> Account Role
                        </Label>
                        <div className="p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 flex items-center gap-3">
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">{user.role} Member</span>
                        </div>
                      </div>

                      <div className="md:col-span-2 pt-6">
                        <Button type="submit" size="lg" className="h-16 px-12 rounded-2xl font-black text-lg shadow-xl uppercase italic" disabled={isSaving}>
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Delete Account Tab */}
              {activeTab === 'delete' && (
                <Card className="border-2 border-destructive/20 shadow-2xl rounded-[40px] bg-white">
                  <CardHeader className="bg-red-50 border-b border-red-100 p-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-red-100 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter text-red-700">
                          Delete Account
                        </CardTitle>
                        <CardDescription className="text-red-600 font-medium">
                          This action is permanent and cannot be undone.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-10 space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-2">
                      <p className="font-bold text-red-700">Deleting your account will:</p>
                      <ul className="text-sm text-red-600 space-y-1 list-disc list-inside font-medium">
                        <li>Permanently remove your account and personal data</li>
                        <li>Cancel all pending orders</li>
                        <li>Remove your order history</li>
                        <li>This action <strong>cannot</strong> be reversed</li>
                      </ul>
                    </div>

                    {!showDeleteConfirm ? (
                      <Button
                        variant="outline"
                        className="border-2 border-destructive text-destructive hover:bg-destructive hover:text-white font-bold h-14 rounded-2xl px-8"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        I want to delete my account
                      </Button>
                    ) : (
                      <div className="space-y-6 border-2 border-red-200 rounded-3xl p-8 bg-red-50/50">
                        <div className="space-y-3">
                          <Label className="font-bold uppercase text-xs tracking-widest text-red-700">
                            Current Password <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Enter your current password"
                            className="h-14 border-2 rounded-2xl border-red-200 focus-visible:ring-red-400"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-bold uppercase text-xs tracking-widest text-red-700">
                            Type DELETE to confirm
                          </Label>
                          <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="h-14 border-2 rounded-2xl border-red-200 focus-visible:ring-red-400 font-mono"
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteConfirmText(''); }}
                            className="h-14 rounded-2xl font-bold border-2"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || deleteConfirmText !== 'DELETE' || !deletePassword}
                            className="h-14 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white px-8"
                          >
                            {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
