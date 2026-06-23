import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Shield, Users, Search, Save } from 'lucide-react';

export default function AdminRoles() {
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const AVAILABLE_ROLES = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'content_manager', label: 'Content Manager' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'marketing_manager', label: 'Marketing Manager' },
    { value: 'customer_support', label: 'Customer Support' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'user', label: 'Standard Customer' }
  ];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setUsers(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading users database:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    if (currentUserRole !== 'super_admin') {
      toast.error("Only Super Admins can update team roles");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      toast.success(`User role updated to ${newRole.replace('_', ' ')}`);
    } catch (err) {
      console.error("Role update failed:", err);
      toast.error("Failed to update user role. Permissions denied.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-luxury-900">User Role Assignments</h1>
          <p className="text-sm text-luxury-500 mt-1">Super admin control panel to configure user permissions and team roles (RBAC)</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-luxury-100 shadow-sm flex items-center gap-3 mb-6 max-w-md">
        <Search className="w-5 h-5 text-luxury-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-sm text-luxury-800 outline-none placeholder-luxury-400 bg-transparent"
        />
      </div>

      {/* Users Matrix Table */}
      <div className="bg-white rounded-2xl border border-luxury-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Access Role dropdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-100 text-sm">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-luxury-50/30">
                  {/* Name and avatar */}
                  <td className="py-3.5 px-4 font-semibold text-luxury-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-luxury-100 to-luxury-200 flex items-center justify-center text-luxury-700 font-bold text-xs uppercase">
                        {(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <div>{u.name || 'Anonymous User'}</div>
                        {u.role === 'super_admin' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gold-600 uppercase tracking-wider mt-0.5">
                            <Shield className="w-3 h-3 text-gold-500 fill-gold-500/20" /> Super User
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-4 text-luxury-600 font-mono text-xs">{u.email}</td>

                  {/* Role text badge */}
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                      u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      u.role === 'content_manager' ? 'bg-emerald-100 text-emerald-800' :
                      u.role === 'marketing_manager' ? 'bg-pink-100 text-pink-800' :
                      u.role === 'inventory_manager' ? 'bg-amber-100 text-amber-800' :
                      u.role === 'customer_support' ? 'bg-teal-100 text-teal-800' :
                      u.role === 'viewer' ? 'bg-slate-100 text-slate-800' : 'bg-luxury-100 text-luxury-600'
                    }`}>
                      {String(u.role || 'user').replace('_', ' ')}
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="py-3.5 px-4 text-luxury-500 text-xs">
                    {u.createdAt ? (
                      u.createdAt.seconds 
                        ? new Date(u.createdAt.seconds * 1000).toLocaleDateString()
                        : new Date(u.createdAt).toLocaleDateString()
                    ) : (
                      'N/A'
                    )}
                  </td>

                  {/* Dropdown Action */}
                  <td className="py-3.5 px-4 text-right">
                    <select
                      value={u.role || 'user'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={currentUserRole !== 'super_admin'}
                      className="px-2.5 py-1.5 border border-luxury-200 rounded-lg text-xs bg-white text-luxury-700 outline-none focus:ring-1 focus:ring-gold-500 disabled:bg-luxury-50 disabled:text-luxury-400 cursor-pointer"
                    >
                      {AVAILABLE_ROLES.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-luxury-400">
                    No users match search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
