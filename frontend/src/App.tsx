import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import PropertyDetails from './pages/PropertyDetails';
import Listings from './pages/Listings';
import Placeholder from './pages/Placeholder';
import Contact from './pages/Contact';
import About from './pages/About';
import Favorites from './pages/Favorites';
import AdminLogin from './pages/admin/Login';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import PropertiesList from './pages/admin/PropertiesList';
import PropertyForm from './pages/admin/PropertyForm';
import InquiriesList from './pages/admin/InquiriesList';
import InquiryDetail from './pages/admin/InquiryDetail';
import Users from './pages/admin/Users';
import Audit from './pages/admin/Audit';
import SettingsPage from './pages/admin/Settings';
import Contacts from './pages/admin/Contacts';
import Broadcast from './pages/admin/Broadcast';
import DigitalIDPage from './pages/admin/DigitalID';
import RoleRoute from './components/RoleRoute';
import { getUser } from './lib/auth';

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function AdminIndex() {
  const role = getUser()?.role;
  if (role === 'listing_manager') return <Navigate to="/admin/properties" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/buy" element={<Listings mode="buy" />} />
        <Route path="/rent" element={<Listings mode="rent" />} />
        <Route path="/sold" element={<Listings mode="sold" />} />
        <Route path="/property/:slug" element={<PropertyDetails />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminIndex />} />
        <Route path="properties" element={<PropertiesList />} />
        <Route path="properties/new" element={<PropertyForm />} />
        <Route path="properties/:id/edit" element={<PropertyForm />} />
        <Route path="inquiries" element={
          <RoleRoute allow={['super_admin', 'admin']}><InquiriesList /></RoleRoute>
        } />
        <Route path="inquiries/:id" element={
          <RoleRoute allow={['super_admin', 'admin']}><InquiryDetail /></RoleRoute>
        } />
        <Route path="contacts" element={
          <RoleRoute allow={['super_admin', 'admin']}><Contacts /></RoleRoute>
        } />
        <Route path="broadcast" element={
          <RoleRoute allow={['super_admin', 'admin']}><Broadcast /></RoleRoute>
        } />
        <Route path="users" element={
          <RoleRoute allow={['super_admin']}><Users /></RoleRoute>
        } />
        <Route path="audit" element={
          <RoleRoute allow={['super_admin']}><Audit /></RoleRoute>
        } />
        <Route path="settings" element={
          <RoleRoute allow={['super_admin', 'admin']}><SettingsPage /></RoleRoute>
        } />
        <Route path="digital-id" element={
          <RoleRoute allow={['super_admin', 'admin']}><DigitalIDPage /></RoleRoute>
        } />
      </Route>
    </Routes>
  );
}
