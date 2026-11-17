import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import {
  listUsers, createUser, updateUser, deleteUser,
  type AdminUserRow,
} from '../../lib/adminUsers';
import { getUser } from '../../lib/auth';

const ROLES = ['super_admin', 'admin', 'listing_manager'] as const;

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  listing_manager: 'Listing Manager',
};

export default function Users() {
  const me = getUser();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['admin-users'], queryFn: listUsers });
  const [showCreate, setShowCreate] = useState(false);

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setShowCreate(false); },
  });
  const upd = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateUser(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const del = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  function onDelete(u: AdminUserRow) {
    if (u.id === me?.id) return;
    if (confirm(`Permanently delete user ${u.email}?`)) del.mutate(u.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-bold text-navy-900 inline-flex items-center gap-2">
          <Shield size={22} /> Users
        </h1>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800">
          <UserPlus size={16} /> Invite user
        </button>
      </div>

      {showCreate && <CreateUserDialog
        onClose={() => setShowCreate(false)}
        onSubmit={(p) => create.mutate(p)}
        busy={create.isPending}
        error={(create.error as any)?.response?.data?.error}
      />}

      <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-navy-600">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {data.map((u) => {
              const isSelf = u.id === me?.id;
              return (
                <tr key={u.id} className="hover:bg-navy-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy-900">
                      {u.full_name || u.email}
                      {isSelf && <span className="ml-2 text-xs text-navy-400">(you)</span>}
                    </div>
                    <div className="text-xs text-navy-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.role} disabled={isSelf}
                      onChange={(e) => upd.mutate({ id: u.id, patch: { role: e.target.value } })}
                      className="rounded-lg border border-navy-200 px-2 py-1 text-xs bg-white disabled:opacity-60">
                      {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={u.is_active} disabled={isSelf}
                        onChange={(e) => upd.mutate({ id: u.id, patch: { is_active: e.target.checked } })} />
                      <span className={u.is_active ? 'text-emerald-700' : 'text-navy-400'}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-xs text-navy-500">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button disabled={isSelf} onClick={() => onDelete(u)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-30 disabled:hover:bg-transparent">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-navy-400">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateUserDialog({
  onClose, onSubmit, busy, error,
}: {
  onClose: () => void;
  onSubmit: (p: { email: string; password: string; full_name: string; role: string }) => void;
  busy: boolean;
  error?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('listing_manager');
  const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ email, password, full_name: fullName, role });
  }

  return (
    <div className="fixed inset-0 z-40 bg-navy-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-3">
        <h2 className="font-display font-bold text-xl">Invite a user</h2>
        <div><label className="text-sm font-medium block mb-1">Full name</label>
          <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><label className="text-sm font-medium block mb-1">Email</label>
          <input className={field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="text-sm font-medium block mb-1">Temporary password</label>
          <input className={field} type="text" required minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-navy-400 mt-1">At least 8 characters. Share securely; they can change it after signing in.</p>
        </div>
        <div><label className="text-sm font-medium block mb-1">Role</label>
          <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={busy}
            className="rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create user'}
          </button>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
