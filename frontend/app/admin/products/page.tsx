'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminShell from '@/components/admin/AdminShell';
import { useAuth } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Product, Collection } from '@/lib/types';
import { extractList, getApiErrorMessage } from '@/lib/api-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, X, Loader2, ImagePlus, Tag, Box, Upload, Image as ImageIcon } from 'lucide-react';
import { formatEtb } from '@/lib/format-currency';

const EMPTY_FORM = {
  title: '', description: '', price: '', inventory: '',
  collection: '', discount_type: '', discount_value: '', discount_active: false, discount_label: '',
};

type ProductForm = typeof EMPTY_FORM & { discount_active: boolean };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-8 border-b">
          <h2 className="text-2xl font-black uppercase tracking-tighter">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}

// ─── Image Upload Panel ────────────────────────────────────────────────────────
function ImageUploadPanel({ productId, images, onUploaded }: {
  productId: number;
  images: { id: number; image: string }[];
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WebP, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post(`/store/products/${productId}/images/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Image uploaded successfully!');
      onUploaded();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Image upload failed.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Remove this image?')) return;
    try {
      await api.delete(`/store/products/${productId}/images/${imageId}/`);
      toast.success('Image removed.');
      onUploaded();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to remove image.'));
    }
  };

  return (
    <div className="space-y-4 border-t pt-6 mt-2">
      <Label className="font-bold uppercase text-xs tracking-widest text-primary flex items-center gap-2">
        <ImageIcon className="h-3 w-3" /> Product Images
      </Label>

      {/* Existing images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-muted">
              <img src={img.image} alt="product" className="w-full h-full object-cover" />
              <button
                onClick={() => handleDeleteImage(img.id)}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-12 rounded-2xl border-2 border-dashed font-bold gap-2 hover:border-primary hover:text-primary transition-colors"
        >
          {uploading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
            : <><Upload className="h-4 w-4" /> Upload Image (max 5 MB)</>
          }
        </Button>
        <p className="text-[10px] text-muted-foreground font-medium mt-1 ml-1">
          Accepted: JPG, PNG, WebP. Max 5 MB per file.
        </p>
      </div>
    </div>
  );
}

// ─── Product Form Modal ────────────────────────────────────────────────────────
function ProductFormModal({
  initial, collections, onSave, onClose, loading, onImageChange,
}: {
  initial?: ProductForm & { id?: number; images?: { id: number; image: string }[] };
  collections: Collection[];
  onSave: (data: ProductForm, id?: number, imageFile?: File | null) => Promise<void>;
  onClose: () => void;
  loading: boolean;
  onImageChange: () => void;
}) {
  const [form, setForm] = useState<ProductForm>(initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM });
  const [productImages, setProductImages] = useState(initial?.images ?? []);
  const [stagedImage, setStagedImage] = useState<File | null>(null);
  const stagedFileRef = useRef<HTMLInputElement>(null);

  const refreshImages = async () => {
    if (!initial?.id) return;
    try {
      const res = await api.get(`/store/products/${initial.id}/images/`);
      setProductImages(extractList(res.data));
    } catch {/* ignore */}
    onImageChange();
  };

  const f = (key: keyof ProductForm) => ({
    value: String(form[key] ?? ''),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm(prev => ({ ...prev, [key]: val }));
    },
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2 space-y-2">
          <Label className="font-bold uppercase text-xs tracking-widest text-primary">Product Title *</Label>
          <Input {...f('title')} placeholder="e.g. Classic White Sneaker" className="h-12 border-2" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label className="font-bold uppercase text-xs tracking-widest text-primary">Description *</Label>
          <textarea
            {...f('description')}
            rows={3}
            placeholder="Product description..."
            className="w-full border-2 rounded-xl p-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold uppercase text-xs tracking-widest text-primary">Price (ETB) *</Label>
          <Input {...f('price')} type="number" min="0" step="0.01" placeholder="0.00" className="h-12 border-2" />
        </div>
        <div className="space-y-2">
          <Label className="font-bold uppercase text-xs tracking-widest text-primary">Inventory *</Label>
          <Input {...f('inventory')} type="number" min="1" placeholder="0" className="h-12 border-2" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label className="font-bold uppercase text-xs tracking-widest text-primary">Collection</Label>
          <select
            value={String(form.collection)}
            onChange={(e) => setForm(prev => ({ ...prev, collection: e.target.value }))}
            className="w-full border-2 rounded-xl h-12 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Select Collection —</option>
            {collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        {/* Discount */}
        <div className="md:col-span-2 border-t pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="discount_active"
              checked={Boolean(form.discount_active)}
              onChange={(e) => setForm(prev => ({ ...prev, discount_active: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="discount_active" className="font-bold uppercase text-xs tracking-widest text-primary cursor-pointer">
              Active Discount
            </Label>
          </div>
          {form.discount_active && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-bold uppercase text-xs tracking-widest text-primary">Discount Type</Label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm(prev => ({ ...prev, discount_type: e.target.value }))}
                  className="w-full border-2 rounded-xl h-12 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Type —</option>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (ETB)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold uppercase text-xs tracking-widest text-primary">Discount Value</Label>
                <Input {...f('discount_value')} type="number" min="0" step="0.01" placeholder="0" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold uppercase text-xs tracking-widest text-primary">Label</Label>
                <Input {...f('discount_label')} placeholder='e.g. "Summer Sale"' className="h-12 border-2" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image upload — for existing products */}
      {initial?.id ? (
        <ImageUploadPanel
          productId={initial.id}
          images={productImages}
          onUploaded={refreshImages}
        />
      ) : (
        <div className="space-y-4 border-t pt-6 mt-2">
          <Label className="font-bold uppercase text-xs tracking-widest text-primary flex items-center gap-2">
            <ImageIcon className="h-3 w-3" /> Initial Product Image (Optional)
          </Label>
          <div className="flex items-center gap-4">
             <input
              ref={stagedFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setStagedImage(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => stagedFileRef.current?.click()}
              className="h-12 rounded-2xl border-2 border-dashed font-bold gap-2 hover:border-primary hover:text-primary transition-colors flex-grow"
            >
              {stagedImage ? <><ImageIcon className="h-4 w-4" /> {stagedImage.name}</> : <><Upload className="h-4 w-4" /> Select Main Image</>}
            </Button>
            {stagedImage && (
              <Button variant="ghost" size="icon" onClick={() => setStagedImage(null)} className="h-12 w-12 rounded-xl text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium ml-1">
             💡 You can add more images after the product is created.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="h-12 rounded-2xl border-2 font-bold px-8">Cancel</Button>
        <Button
          onClick={() => onSave(form, initial?.id, stagedImage)}
          disabled={loading || !form.title || !form.price || !form.inventory}
          className="h-12 rounded-2xl font-black px-8 shadow-lg"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {initial?.id ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminProductsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<(ProductForm & { id: number; images: { id: number; image: string }[] }) | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') router.push('/');
  }, [user, router]);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`/store/products/${q ? `?search=${encodeURIComponent(q)}` : ''}`),
        api.get('/store/collections/'),
      ]);
      setProducts(extractList<Product>(pRes.data));
      setCollections(extractList<Collection>(cRes.data));
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.role === 'admin') load(); }, [user, load]);

  const handleSave = async (form: ProductForm, id?: number, imageFile?: File | null) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        inventory: parseInt(form.inventory),
        discount_active: form.discount_active,
      };
      if (form.collection) payload.collection = parseInt(form.collection);
      if (form.discount_active) {
        payload.discount_type = form.discount_type || null;
        payload.discount_value = form.discount_value ? parseFloat(form.discount_value) : null;
        payload.discount_label = form.discount_label || null;
      }

      if (id) {
        await api.patch(`/store/products/${id}/`, payload);
        toast.success('Product updated.');
      } else {
        const res = await api.post('/store/products/', payload);
        const newProduct = res.data;
        
        // Auto-upload staged image if exists
        if (imageFile) {
          try {
            const formData = new FormData();
            formData.append('image', imageFile);
            await api.post(`/store/products/${newProduct.id}/images/`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Product created with image!');
          } catch (imgErr) {
            toast.error('Product created, but image upload failed.');
          }
        } else {
          toast.success('Product created successfully.');
        }
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to save product.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/store/products/${product.id}/`);
      toast.success('Product deleted.');
      load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Cannot delete — product may be linked to orders.'));
    }
  };

  const openEdit = (p: Product) => {
    const collectionId = typeof p.collection === 'object' && p.collection ? String(p.collection.id) : String(p.collection ?? '');
    setEditing({
      id: p.id,
      title: p.title,
      description: p.description,
      price: String(p.unit_price),
      inventory: String(p.inventory),
      collection: collectionId,
      discount_type: p.discount_type || '',
      discount_value: p.discount_value != null ? String(p.discount_value) : '',
      discount_active: Boolean(p.discount_active),
      discount_label: p.discount_label || '',
      images: p.images ?? [],
    });
    setModal('edit');
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      <AdminShell
        title="Manage Products"
        subtitle={`${products.length} product${products.length !== 1 ? 's' : ''} in store`}
        actions={
          <Button className="rounded-2xl font-black h-12 px-6 shadow-lg" onClick={() => { setEditing(null); setModal('create'); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        }
      >
        {/* Search */}
        <Card className="border-none shadow-sm rounded-3xl bg-white">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load(search)}
                className="pl-10 h-12 border-2 rounded-2xl pr-28"
              />
              {search && (
                <Button size="icon" variant="ghost" className="absolute right-14 top-1/2 -translate-y-1/2"
                  onClick={() => { setSearch(''); load(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={() => load(search)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 rounded-xl font-bold text-xs px-4">
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-none shadow-sm rounded-[40px] bg-white overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-muted-foreground">
                <Box className="h-12 w-12 opacity-20" />
                <p className="font-bold">No products found</p>
                <Button onClick={() => { setEditing(null); setModal('create'); }} className="rounded-2xl font-black h-10 px-6">
                  <Plus className="h-4 w-4 mr-2" /> Add First Product
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      {['Product', 'Images', 'Collection', 'Price', 'Inventory', 'Discount', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((p) => {
                      const collTitle = typeof p.collection === 'object' && p.collection ? p.collection.title : '—';
                      return (
                        <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                {p.images?.[0]?.image ? (
                                  <img src={p.images[0].image} alt={p.title} className="h-10 w-10 rounded-xl object-cover" />
                                ) : (
                                  <ImagePlus className="h-4 w-4 text-primary/40" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{p.title}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">ID #{p.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-xs font-bold text-muted-foreground">
                              {p.images?.length ?? 0} img{(p.images?.length ?? 0) !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant="outline" className="font-bold text-xs">
                              <Tag className="h-3 w-3 mr-1" />{collTitle}
                            </Badge>
                          </td>
                          <td className="px-6 py-5 font-black text-primary">{formatEtb(p.unit_price)}</td>
                          <td className="px-6 py-5 font-bold">
                            <Badge className={p.inventory < 5 ? 'bg-red-100 text-red-700' : p.inventory < 20 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                              {p.inventory} pcs
                            </Badge>
                          </td>
                          <td className="px-6 py-5">
                            {p.discount_active ? (
                              <Badge className="bg-blue-100 text-blue-700 font-bold text-xs">
                                {p.discount_type === 'percent' ? `${p.discount_value}% OFF` : p.discount_value ? formatEtb(Number(p.discount_value)) + ' OFF' : 'ON SALE'}
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="outline" onClick={() => openEdit(p)} className="rounded-xl border-2 h-9 w-9" title="Edit & manage images">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="outline" onClick={() => handleDelete(p)}
                                className="rounded-xl border-2 h-9 w-9 hover:border-destructive hover:text-destructive" title="Delete product">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </AdminShell>
      <Footer />

      {/* Create/Edit Modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Add New Product' : 'Edit Product & Images'}
          onClose={() => setModal(null)}
        >
          <ProductFormModal
            initial={editing ?? undefined}
            collections={collections}
            onSave={handleSave}
            onClose={() => setModal(null)}
            loading={saving}
            onImageChange={load}
          />
        </Modal>
      )}
    </div>
  );
}
