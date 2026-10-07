import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2, Link2, AlertCircle, Check, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const applyMarkup = (price, markup) => {
  if (price === null || price === undefined) return '';
  const pct = parseFloat(markup) || 0;
  return (price * (1 + pct / 100)).toFixed(2);
};

export function ProductImportDialog({ open, onOpenChange, categories, getAuthHeader, shopifyConfigured, onImported }) {
  const [urls, setUrls] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [markup, setMarkup] = useState('0');
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pushToShopify, setPushToShopify] = useState(false);

  const reset = () => {
    setUrls('');
    setItems([]);
  };

  const updateItem = (index, changes) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  const handleFetch = async () => {
    const list = [...new Set(urls.split('\n').map(u => u.trim()).filter(Boolean))];
    if (list.length === 0) {
      toast.error('Paste at least one product URL');
      return;
    }
    setFetching(true);
    setItems(list.map(url => ({ url, status: 'loading' })));

    // One at a time so we don't hammer the source site
    for (let i = 0; i < list.length; i++) {
      try {
        const { data } = await axios.post(
          `${API}/admin/products/import/preview`,
          { url: list[i] },
          { headers: getAuthHeader() }
        );
        updateItem(i, {
          status: 'ready',
          selected: true,
          data,
          title: data.title,
          price: applyMarkup(data.price, markup),
          original_price: data.original_price ?? '',
          category,
          images: data.images,
          excludedImages: [],
        });
      } catch (error) {
        updateItem(i, { status: 'error', error: error.response?.data?.detail || 'Could not read this page' });
      }
    }
    setFetching(false);
  };

  const toggleImage = (index, src) => {
    const item = items[index];
    const excluded = item.excludedImages.includes(src)
      ? item.excludedImages.filter(s => s !== src)
      : [...item.excludedImages, src];
    updateItem(index, { excludedImages: excluded });
  };

  const readyItems = items.filter(item => item.status === 'ready' && item.selected);

  const handleImport = async () => {
    setImporting(true);
    let saved = 0;
    let pushed = 0;
    for (const item of readyItems) {
      const images = item.images.filter(src => !item.excludedImages.includes(src));
      try {
        const { data: created } = await axios.post(`${API}/admin/products`, {
          title: item.title,
          description: item.data.description || '',
          category: item.category,
          subcategory: item.data.product_type || '',
          price: parseFloat(item.price) || 0,
          original_price: item.original_price ? parseFloat(item.original_price) : null,
          brand: item.data.brand || '',
          image_url: images[0] || '',
          images,
          features: item.data.features || [],
          in_stock: item.data.in_stock !== false,
          source_url: item.url,
        }, { headers: getAuthHeader() });
        saved++;

        if (pushToShopify) {
          try {
            await axios.post(`${API}/admin/products/${created.id}/shopify`, { status: 'DRAFT' }, { headers: getAuthHeader() });
            pushed++;
          } catch (error) {
            toast.error(`Shopify: ${item.title}: ${error.response?.data?.detail || 'failed'}`);
          }
        }
      } catch (error) {
        toast.error(`${item.title}: ${error.response?.data?.detail || 'failed to save'}`);
      }
    }
    setImporting(false);
    if (saved) {
      toast.success(`Imported ${saved} product${saved === 1 ? '' : 's'}${pushToShopify ? `, ${pushed} sent to Shopify` : ''}`);
      reset();
      onOpenChange(false);
      onImported();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="import-dialog">
        <DialogHeader>
          <DialogTitle>Import products from a website</DialogTitle>
          <DialogDescription>
            Paste product page links (one per line). Title, description, price, brand and all images are copied.
            Only import products you have permission to sell and use images from.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="import-urls">Product URLs</Label>
            <Textarea
              id="import-urls"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={'https://some-store.com/products/item-one\nhttps://another-site.com/item/123'}
              rows={4}
              data-testid="import-urls"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category for imported products</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="import-markup">Price markup %</Label>
              <Input
                id="import-markup"
                type="number"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
          </div>

          <Button onClick={handleFetch} disabled={fetching} variant="outline" className="w-full" data-testid="fetch-products-btn">
            {fetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
            {fetching ? 'Reading pages...' : 'Fetch product details'}
          </Button>

          {items.map((item, index) => (
            <div key={item.url} className="border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs text-slate-400 truncate">{item.url}</p>

              {item.status === 'loading' && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              )}

              {item.status === 'error' && (
                <div className="flex items-start gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {item.error}
                </div>
              )}

              {item.status === 'ready' && (
                <>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => updateItem(index, { selected: e.target.checked })}
                    />
                    Import this product
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-6 sm:col-span-4">
                      <Label>Title</Label>
                      <Input value={item.title} onChange={(e) => updateItem(index, { title: e.target.value })} />
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <Label>Your price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, { price: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <Label>Category</Label>
                      <Select value={item.category} onValueChange={(v) => updateItem(index, { category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Source price: {item.data.price != null ? `${item.data.price} ${item.data.currency || ''}` : 'not found — enter it manually'}
                    {item.data.brand ? ` · Brand: ${item.data.brand}` : ''}
                    {item.data.in_stock === false ? ' · Out of stock at source' : ''}
                  </p>
                  {item.images.length > 0 ? (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Images (click to leave one out)</p>
                      <div className="flex flex-wrap gap-2">
                        {item.images.map(src => {
                          const excluded = item.excludedImages.includes(src);
                          return (
                            <button
                              key={src}
                              type="button"
                              onClick={() => toggleImage(index, src)}
                              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 ${
                                excluded ? 'border-slate-200 opacity-30' : 'border-indigo-500'
                              }`}
                            >
                              <img src={src} alt="" className="w-full h-full object-cover" />
                              <span className="absolute top-0.5 right-0.5 bg-white rounded-full">
                                {excluded ? <X className="w-3 h-3 text-slate-500" /> : <Check className="w-3 h-3 text-indigo-600" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">No images found — you can add image URLs after importing.</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 sm:items-center">
          {shopifyConfigured && (
            <label className="flex items-center gap-2 text-sm mr-auto">
              <input type="checkbox" checked={pushToShopify} onChange={(e) => setPushToShopify(e.target.checked)} />
              Also create in Shopify (as draft)
            </label>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={importing || fetching || readyItems.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="import-products-btn"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Import {readyItems.length || ''} product{readyItems.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
