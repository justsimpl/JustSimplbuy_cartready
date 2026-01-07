import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  Search, ChevronLeft, ChevronRight, Loader2, 
  FileText, User, ShoppingCart, Truck, Shield, Clock,
  Plus, Edit, Trash2, Key, RefreshCw
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const actionIcons = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  LOGIN: Shield,
  PASSWORD_RESET: Key,
  PASSWORD_RESET_REQUEST: Key,
  PASSWORD_RESET_COMPLETE: Key,
  VIEW: FileText,
};

const actionColors = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  PASSWORD_RESET: 'bg-amber-100 text-amber-700',
  PASSWORD_RESET_REQUEST: 'bg-amber-100 text-amber-700',
  PASSWORD_RESET_COMPLETE: 'bg-green-100 text-green-700',
  VIEW: 'bg-slate-100 text-slate-700',
};

const resourceIcons = {
  user: User,
  order: ShoppingCart,
  shipment: Truck,
  auth: Shield,
};

export default function AdminAuditLogs() {
  const { getAuthHeader } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [actions, setActions] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);

  useEffect(() => {
    fetchLogs();
    fetchFilters();
  }, [page, actionFilter, resourceFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (resourceFilter && resourceFilter !== 'all') params.append('resource_type', resourceFilter);
      
      const response = await axios.get(`${API}/admin/audit-logs?${params}`, { headers: getAuthHeader() });
      setLogs(response.data.logs);
      setTotalPages(response.data.total_pages);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await axios.get(`${API}/admin/audit-logs/actions`, { headers: getAuthHeader() });
      setActions(response.data.actions || []);
      setResourceTypes(response.data.resource_types || []);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDetails = (details) => {
    if (!details || Object.keys(details).length === 0) return '-';
    
    return Object.entries(details).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (value.from !== undefined && value.to !== undefined) {
          return `${key}: ${value.from} → ${value.to}`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${value}`;
    }).join(', ');
  };

  const ActionIcon = ({ action }) => {
    const Icon = actionIcons[action] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const ResourceIcon = ({ resourceType }) => {
    const Icon = resourceIcons[resourceType] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-audit-logs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
              Audit Logs
            </h2>
            <p className="text-slate-500 mt-1">{total} logged actions</p>
          </div>
          
          <Button variant="outline" onClick={fetchLogs} data-testid="refresh-logs-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48" data-testid="filter-action">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map(action => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48" data-testid="filter-resource">
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {resourceTypes.map(type => (
                <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="audit-logs-table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-600">Timestamp</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Admin</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Action</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Resource</th>
                    <th className="text-left p-4 font-semibold text-slate-600">Details</th>
                    <th className="text-left p-4 font-semibold text-slate-600">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50" data-testid={`log-row-${log.id}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-900">{log.admin_name}</p>
                          <p className="text-xs text-slate-500">{log.admin_email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`capitalize flex items-center gap-1 w-fit ${actionColors[log.action] || 'bg-slate-100'}`}>
                          <ActionIcon action={log.action} />
                          {log.action?.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <ResourceIcon resourceType={log.resource_type} />
                          <div>
                            <span className="capitalize text-slate-700">{log.resource_type}</span>
                            {log.resource_id && (
                              <span className="text-xs text-slate-400 block font-mono">#{log.resource_id}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600 max-w-xs truncate block" title={formatDetails(log.details)}>
                          {formatDetails(log.details)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-500 font-mono">
                          {log.ip_address || '-'}
                        </span>
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
      </div>
    </AdminLayout>
  );
}
