import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users as UsersIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  ShieldOff,
  Loader2,
  Mail,
  Calendar
} from 'lucide-react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  firstName: string | null;
  preferredName: string | null;
  age: number | null;
  isAdmin: boolean;
}

interface UserDetails extends User {
  city: string | null;
  streakCount: number | null;
  lastCheckinDate: string | null;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await api.admin.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined
      });
      if (error) throw new Error(error);
      setUsers(data?.users || []);
      if (data?.pagination) {
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [loadUsers]);

  const loadUserDetails = async (userId: string) => {
    try {
      setLoadingUser(true);
      const { data, error } = await api.admin.getUser(userId);
      if (error) throw new Error(error);
      setSelectedUser(data?.user || null);
    } catch (err) {
      console.error('Error loading user details:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const toggleAdminRole = async () => {
    if (!selectedUser) return;
    try {
      setUpdatingRole(true);
      const { error } = await api.admin.updateUserRole(selectedUser.id, {
        isAdmin: !selectedUser.isAdmin
      });
      if (error) throw new Error(error);
      setSelectedUser({ ...selectedUser, isAdmin: !selectedUser.isAdmin });
      loadUsers();
    } catch (err) {
      console.error('Error updating user role:', err);
      alert('Failed to update user role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDisplayName = (user: User) => {
    return user.preferredName || user.firstName || user.email.split('@')[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-deepSage">User Management</h1>
        <p className="text-textSecondaryLight mt-1">
          View and manage user accounts
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-10 pr-4 py-2 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>
        <span className="text-sm text-textSecondaryLight">
          {pagination.total} users total
        </span>
      </div>

      <motion.div
        className="cosmic-card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-teal animate-spin mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UsersIcon className="w-12 h-12 text-sage/40 mx-auto mb-4" />
            <p className="text-textSecondaryLight">
              {search ? 'No users match your search' : 'No users found'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sage/5 border-b border-borderMutedLight">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      User
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      Email
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      Status
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      Joined
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => loadUserDetails(user.id)}
                      className="border-b border-borderMutedLight last:border-0 hover:bg-sage/5 transition-colors cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-teal">
                              {getDisplayName(user).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-deepSage">
                              {getDisplayName(user)}
                            </p>
                            {user.age && (
                              <p className="text-xs text-textSecondaryLight">
                                Age: {user.age}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-deepSage">{user.email}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.emailVerified
                              ? 'bg-teal/10 text-teal'
                              : 'bg-gold/10 text-gold'
                          }`}
                        >
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-textSecondaryLight">
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                      <td className="p-4">
                        {user.isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-coral/10 text-coral">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-borderMutedLight">
                <span className="text-sm text-textSecondaryLight">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1)
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg hover:bg-sage/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.min(prev.pages, prev.page + 1)
                      }))
                    }
                    disabled={pagination.page === pagination.pages}
                    className="p-2 rounded-lg hover:bg-sage/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {(selectedUser || loadingUser) && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 w-full max-w-md bg-surface shadow-xl z-50 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-deepSage">
                    User Details
                  </h2>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 text-sage hover:text-deepSage"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {loadingUser ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 text-teal animate-spin mx-auto" />
                  </div>
                ) : selectedUser ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-teal">
                          {getDisplayName(selectedUser as User)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-deepSage">
                          {getDisplayName(selectedUser as User)}
                        </h3>
                        <p className="text-textSecondaryLight">
                          {selectedUser.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="cosmic-card p-4">
                        <div className="flex items-center gap-2 text-sage mb-1">
                          <Mail className="w-4 h-4" />
                          <span className="text-xs uppercase">Status</span>
                        </div>
                        <p className="font-medium text-deepSage">
                          {selectedUser.emailVerified ? 'Verified' : 'Unverified'}
                        </p>
                      </div>
                      <div className="cosmic-card p-4">
                        <div className="flex items-center gap-2 text-sage mb-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs uppercase">Joined</span>
                        </div>
                        <p className="font-medium text-deepSage">
                          {formatDate(selectedUser.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-textSecondaryLight uppercase">
                        Profile Info
                      </h4>
                      <div className="cosmic-card p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-textSecondaryLight">Age</span>
                          <span className="text-deepSage">
                            {selectedUser.age || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textSecondaryLight">City</span>
                          <span className="text-deepSage">
                            {selectedUser.city || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textSecondaryLight">Streak</span>
                          <span className="text-deepSage">
                            {selectedUser.streakCount || 0} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textSecondaryLight">
                            Last Check-in
                          </span>
                          <span className="text-deepSage">
                            {formatDate(selectedUser.lastCheckinDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-textSecondaryLight uppercase">
                        Role Management
                      </h4>
                      <div className="cosmic-card p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-deepSage">
                              Admin Access
                            </p>
                            <p className="text-sm text-textSecondaryLight">
                              {selectedUser.isAdmin
                                ? 'This user has admin privileges'
                                : 'This user has standard access'}
                            </p>
                          </div>
                          <button
                            onClick={toggleAdminRole}
                            disabled={updatingRole}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                              selectedUser.isAdmin
                                ? 'bg-coral/10 text-coral hover:bg-coral/20'
                                : 'bg-teal/10 text-teal hover:bg-teal/20'
                            } disabled:opacity-50`}
                          >
                            {updatingRole ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : selectedUser.isAdmin ? (
                              <>
                                <ShieldOff className="w-4 h-4" />
                                Remove
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4" />
                                Grant
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
