import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, 
  Loader2, ShoppingCart, Eye, Package, User, Calendar
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    user_id: '',
    items: [{ product_id: '', product_title: '', quantity: 1, price: 0 }],
    shipping_address: '',
    billing_address: '',
    payment_method: 'credit_card',
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchLookups();
    fetchUsers();
  }, [page, searchQuery, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await axios.get(`${API}/admin/orders?${params}`);
      setOrders(response.data.orders);
      setTotalPages(response.data.total_pages);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const response = await axios.get(`${API}/admin/lookups`);
      setLookups(response.data);
    } catch (error) {
      console.error('Failed to load lookups');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users?limit=100`);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.user_id || !formData.shipping_address) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setFormLoading(true);
    try {
      await axios.post(`${API}/admin/orders`, formData);
      toast.success('Order created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    setFormLoading(true);
    try {
      await axios.put(`${API}/admin/orders/${selectedOrder.id}`, {
        status: formData.status,
        shipping_address: formData.shipping_address,
        billing_address: formData.billing_address,
        notes: formData.notes
      });
      toast.success('Order updated successfully');
      setEditDialogOpen(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update order');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (orderId) => {
    try {
      await axios.delete(`${API}/admin/orders/${orderId}`);
      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      items: [{ product_id: '', product_title: '', quantity: 1, price: 0 }],
      shipping_address: '',
      billing_address: '',
      payment_method: 'credit_card',
      notes: ''
    });
  };

  const openEditDialog = (order) => {
    setSelectedOrder(order);
    setFormData({
      status: order.status,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      notes: order.notes || ''
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = async (orderId) => {
    try {
      const response = await axios.get(`${API}/admin/orders/${orderId}`);
      setSelectedOrder(response.data);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load order details');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', product_title: '', quantity: 1, price: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'quantity' || field === 'price' ? Number(value) : value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-orders-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
              Orders Management
            </h2>
            <p className="text-slate-500 mt-1">{total} total orders</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-order-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div>
                  <Label>Customer *</Label>
                  <Select value={formData.user_id} onValueChange={(v) => setFormData({ ...formData, user_id: v })}>
                    <SelectTrigger data-testid="order-user-select">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Order Items *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="w-4 h-4 mr-1" /> Add Item
                    </Button>
                  </div>
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        placeholder="Product title"
                        value={item.product_title}
                        onChange={(e) => updateItem(index, 'product_title', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="w-20"
                        min="1"
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        className="w-28"
                        step="0.01"
                        min="0"
                      />
                      {formData.items.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Shipping Address *</Label>
                    <Textarea
                      value={formData.shipping_address}
                      onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      placeholder="123 Main St, City, State, ZIP"
                      rows={3}
                      data-testid="order-shipping-address"
                    />
                  </div>
                  <div>
                    <Label>Billing Address</Label>
                    <Textarea
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      placeholder="Same as shipping or different"
                      rows={3}
                    />
                  </div>
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes"
                    rows={2}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={formLoading} data-testid="submit-create-order">
                    {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Order
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by order ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-10"
              data-testid="search-orders-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40" data-testid="filter-status-select">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {lookups?.order_statuses?.map(status => (
                <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="orders-table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-600">Order ID</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Customer</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Items</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Total</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Status</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Date</th>
                    <th className="text-right p-4 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50" data-testid={`order-row-${order.id}`}>
                      <td className="p-4">
                        <span className="font-mono font-medium text-indigo-600">#{order.id}</span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-900">{order.user_name || 'N/A'}</p>
                          <p className="text-sm text-slate-500">{order.user_email || ''}</p>
                        </div>
                      </td>
                      <td className="p-4">{order.items?.length || 0} items</td>
                      <td className="p-4 font-medium mono">${order.total_amount?.toFixed(2)}</td>
                      <td className="p-4">
                        <Badge className={`capitalize ${statusColors[order.status] || 'bg-gray-100'}`}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-500 text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openViewDialog(order.id)} data-testid={`view-order-${order.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(order)} data-testid={`edit-order-${order.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`delete-order-${order.id}`}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete order #{order.id}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Order #{selectedOrder?.id}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger data-testid="edit-order-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups?.order_statuses?.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Shipping Address</Label>
                <Textarea
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>Billing Address</Label>
                <Textarea
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={formLoading} data-testid="submit-edit-order">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Customer</p>
                    <p className="font-medium">{selectedOrder.user_name}</p>
                    <p className="text-sm text-slate-500">{selectedOrder.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <Badge className={`capitalize ${statusColors[selectedOrder.status]}`}>{selectedOrder.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Amount</p>
                    <p className="font-bold text-xl mono">${selectedOrder.total_amount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Payment Method</p>
                    <p className="capitalize">{selectedOrder.payment_method?.replace('_', ' ')}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-slate-500 mb-2">Items</p>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    {selectedOrder.items?.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.product_title} x{item.quantity}</span>
                        <span className="mono">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Shipping Address</p>
                    <p className="text-sm">{selectedOrder.shipping_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Billing Address</p>
                    <p className="text-sm">{selectedOrder.billing_address || 'Same as shipping'}</p>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm text-slate-500">Notes</p>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}

                {selectedOrder.shipments?.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Shipments</p>
                    <div className="space-y-2">
                      {selectedOrder.shipments.map((shipment) => (
                        <div key={shipment.id} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{shipment.carrier} - {shipment.tracking_number}</p>
                            <p className="text-sm text-slate-500 capitalize">{shipment.status}</p>
                          </div>
                          <Link to={`/admin/shipments`} className="text-indigo-600 text-sm hover:underline">
                            View →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
