import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, LayoutDashboard, LayoutList, PlusCircle, LogOut, Mail, Shield, Settings as Cog, History,
  Users as UsersIcon, Megaphone, IdCard,
} from 'lucide-react';
import { isLoggedIn, getUser, logout } from '../../lib/auth';
import { unreadInquiries } from '../../lib/adminInquiries';

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-navy-800 text-white' : 'text-navy-200 hover:bg-navy-800/60 hover:text-white'
  }`;

export default function AdminLayout() {
  const nav = useNavigate();
  if (!isLoggedIn()) return <Navigate to="/admin/login" replace />;
  const user = getUser();
  const role = user?.role ?? '';
  const canManagerView = role === 'super_admin' || role === 'admin';
  const canOwnerView = role === 'super_admin';

  const { data: unread = 0 } = useQuery({
    queryKey: ['admin-unread-inquiries'],
    queryFn: unreadInquiries,
    refetchInterval: 60_000,
    enabled: canManagerView,
  });

  async function onLogout() {
    await logout();
    nav('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex bg-navy-50">
      <aside className="w-60 shrink-0 bg-navy-900 text-white flex flex-col">
        <div className="h-16 flex items-center gap-2 px-4 border-b border-navy-800">
          <Home className="text-accent-500" size={20} />
          <span className="font-display font-bold">Nur Kalam Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {canManagerView && (
            <NavLink to="/admin" end className={link}><LayoutDashboard size={16} /> Dashboard</NavLink>
          )}
          <NavLink to="/admin/properties"
            end={!canManagerView}
            className={link}><LayoutList size={16} /> Properties</NavLink>
          <NavLink to="/admin/properties/new" className={link}><PlusCircle size={16} /> New property</NavLink>
          {canManagerView && (
            <NavLink to="/admin/inquiries" className={link}>
              <Mail size={16} /> Inquiries
              {unread > 0 && (
                <span className="ml-auto rounded-full bg-accent-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                  {unread}
                </span>
              )}
            </NavLink>
          )}
          {canManagerView && (
            <NavLink to="/admin/contacts" className={link}><UsersIcon size={16} /> Contacts</NavLink>
          )}
          {canManagerView && (
            <NavLink to="/admin/broadcast" className={link}><Megaphone size={16} /> Broadcast</NavLink>
          )}
          {canOwnerView && (
            <NavLink to="/admin/users" className={link}><Shield size={16} /> Users</NavLink>
          )}
          {canOwnerView && (
            <NavLink to="/admin/audit" className={link}><History size={16} /> Audit log</NavLink>
          )}
          {canManagerView && (
            <NavLink to="/admin/digital-id" className={link}><IdCard size={16} /> Digital ID</NavLink>
          )}
          {canManagerView && (
            <NavLink to="/admin/settings" className={link}><Cog size={16} /> Settings</NavLink>
          )}
        </nav>
        <div className="p-3 border-t border-navy-800">
          <p className="text-xs text-navy-300 truncate">{user?.email}</p>
          <p className="text-[10px] text-navy-400 mb-2 capitalize">{role.replace('_', ' ')}</p>
          <button onClick={onLogout}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-200 hover:bg-navy-800 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
