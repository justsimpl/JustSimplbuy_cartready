import { useState, useEffect } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, 
  Loader2, Truck, Eye, Package, MapPin
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  picked_up: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
};

export default function AdminShipments() {
  const { getAuthHeader } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    order_id: '',
    carrier: '',
    tracking_number: '',
    shipping_method: 'standard',
    estimated_delivery: '',
    notes: ''
  });

  useEffect(() => {
    fetchShipments();
    fetchLookups();
    fetchOrders();
  }, [page, statusFilter, carrierFilter]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (carrierFilter && carrierFilter !== 'all') params.append('carrier', carrierFilter);
      
      const response = await axios.get(`${API}/admin/shipments?${params}`, { headers: getAuthHeader() });
      setShipments(response.data.shipments);
      setTotalPages(response.data.total_pages);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const response = await axios.get(`${API}/admin/lookups`, { headers: getAuthHeader() });
      setLookups(response.data);
    } catch (error) {
      console.error('Failed to load lookups');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders?limit=100`, { headers: getAuthHeader() });
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Failed to load orders');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.order_id || !formData.carrier || !formData.tracking_number) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setFormLoading(true);
    try {
      await axios.post(`${API}/admin/shipments`, formData, { headers: getAuthHeader() });
      toast.success('Shipment created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create shipment');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedShipment) return;
    
    setFormLoading(true);
    try {
      await axios.put(`${API}/admin/shipments/${selectedShipment.id}`, formData, { headers: getAuthHeader() });
      toast.success('Shipment updated successfully');
      setEditDialogOpen(false);
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update shipment');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (shipmentId) => {
    try {
      await axios.delete(`${API}/admin/shipments/${shipmentId}`, { headers: getAuthHeader() });
      toast.success('Shipment deleted successfully');
      fetchShipments();
    } catch (error) {
      toast.error('Failed to delete shipment');
    }
  };

  const resetForm = () => {
    setFormData({
      order_id: '',
      carrier: '',
      tracking_number: '',
      shipping_method: 'standard',
      estimated_delivery: '',
      notes: ''
    });
  };

  const openEditDialog = (shipment) => {
    setSelectedShipment(shipment);
    setFormData({
      status: shipment.status,
      carrier: shipment.carrier,
      tracking_number: shipment.tracking_number,
      shipping_method: shipment.shipping_method,
      estimated_delivery: shipment.estimated_delivery || '',
      actual_delivery: shipment.actual_delivery || '',
      notes: shipment.notes || ''
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = async (shipmentId) => {
    try {
      const response = await axios.get(`${API}/admin/shipments/${shipmentId}`, { headers: getAuthHeader() });
      setSelectedShipment(response.data);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load shipment details');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-shipments-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
              Shipments Management
            </h2>
            <p className="text-slate-500 mt-1">{total} total shipments</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-shipment-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Shipment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Shipment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div>
                  <Label>Order *</Label>
                  <Select value={formData.order_id} onValueChange={(v) => setFormData({ ...formData, order_id: v })}>
                    <SelectTrigger data-testid="shipment-order-select">
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          #{order.id} - ${order.total_amount?.toFixed(2)} ({order.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Carrier *</Label>
                  <Select value={formData.carrier} onValueChange={(v) => setFormData({ ...formData, carrier: v })}>
                    <SelectTrigger data-testid="shipment-carrier-select">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups?.carriers?.map(carrier => (
                        <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tracking Number *</Label>
                  <Input
                    value={formData.tracking_number}
                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                    placeholder="1Z999AA10123456784"
                    data-testid="shipment-tracking-input"
                  />
                </div>

                <div>
                  <Label>Shipping Method</Label>
                  <Select value={formData.shipping_method} onValueChange={(v) => setFormData({ ...formData, shipping_method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups?.shipping_methods?.map(method => (
                        <SelectItem key={method} value={method} className="capitalize">{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Estimated Delivery</Label>
                  <Input
                    type="date"
                    value={formData.estimated_delivery}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                  />
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
                  <Button type="submit" disabled={formLoading} data-testid="submit-create-shipment">
                    {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Shipment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48" data-testid="filter-shipment-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {lookups?.shipment_statuses?.map(status => (
                <SelectItem key={status} value={status} className="capitalize">{status.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={carrierFilter} onValueChange={(v) => { setCarrierFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48" data-testid="filter-carrier">
              <SelectValue placeholder="All Carriers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Carriers</SelectItem>
              {lookups?.carriers?.map(carrier => (
                <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Shipments Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Truck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No shipments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="shipments-table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-600">Shipment ID</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Order</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Carrier</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Tracking</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Status</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Method</th>
                    <th className="text-right p-4 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-slate-50" data-testid={`shipment-row-${shipment.id}`}>
                      <td className="p-4">
                        <span className="font-mono font-medium text-indigo-600">#{shipment.id}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono">#{shipment.order_id}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400" />
                          {shipment.carrier}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm">{shipment.tracking_number}</span>
                      </td>
                      <td className="p-4">
                        <Badge className={`capitalize ${statusColors[shipment.status] || 'bg-gray-100'}`}>
                          {shipment.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 capitalize">{shipment.shipping_method}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openViewDialog(shipment.id)} data-testid={`view-shipment-${shipment.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(shipment)} data-testid={`edit-shipment-${shipment.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`delete-shipment-${shipment.id}`}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete shipment #{shipment.id}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(shipment.id)} className="bg-red-600 hover:bg-red-700">
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
              <DialogTitle>Edit Shipment #{selectedShipment?.id}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger data-testid="edit-shipment-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups?.shipment_statuses?.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">{status.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carrier</Label>
                <Select value={formData.carrier} onValueChange={(v) => setFormData({ ...formData, carrier: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups?.carriers?.map(carrier => (
                      <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tracking Number</Label>
                <Input
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Shipping Method</Label>
                <Select value={formData.shipping_method} onValueChange={(v) => setFormData({ ...formData, shipping_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups?.shipping_methods?.map(method => (
                      <SelectItem key={method} value={method} className="capitalize">{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Delivery</Label>
                <Input
                  type="date"
                  value={formData.estimated_delivery}
                  onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                />
              </div>
              <div>
                <Label>Actual Delivery</Label>
                <Input
                  type="date"
                  value={formData.actual_delivery}
                  onChange={(e) => setFormData({ ...formData, actual_delivery: e.target.value })}
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
                <Button type="submit" disabled={formLoading} data-testid="submit-edit-shipment">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Shipment Details #{selectedShipment?.id}</DialogTitle>
            </DialogHeader>
            {selectedShipment && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Order ID</p>
                    <p className="font-mono font-medium">#{selectedShipment.order_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <Badge className={`capitalize ${statusColors[selectedShipment.status]}`}>
                      {selectedShipment.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Carrier</p>
                    <p className="font-medium">{selectedShipment.carrier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tracking Number</p>
                    <p className="font-mono">{selectedShipment.tracking_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Shipping Method</p>
                    <p className="capitalize">{selectedShipment.shipping_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Created</p>
                    <p>{new Date(selectedShipment.created_at).toLocaleString()}</p>
                  </div>
                </div>
                
                {selectedShipment.estimated_delivery && (
                  <div>
                    <p className="text-sm text-slate-500">Estimated Delivery</p>
                    <p>{new Date(selectedShipment.estimated_delivery).toLocaleDateString()}</p>
                  </div>
                )}

                {selectedShipment.actual_delivery && (
                  <div>
                    <p className="text-sm text-slate-500">Actual Delivery</p>
                    <p>{new Date(selectedShipment.actual_delivery).toLocaleDateString()}</p>
                  </div>
                )}

                {selectedShipment.notes && (
                  <div>
                    <p className="text-sm text-slate-500">Notes</p>
                    <p className="text-sm">{selectedShipment.notes}</p>
                  </div>
                )}

                {selectedShipment.order && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500 mb-2">Order Details</p>
                    <p className="font-medium">{selectedShipment.order.items?.length || 0} items</p>
                    <p className="text-sm text-slate-500">{selectedShipment.order.shipping_address}</p>
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
