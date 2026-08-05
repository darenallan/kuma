import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsListPage from './pages/clients/ClientsListPage';
import TemplatesListPage from './pages/templates/TemplatesListPage';
import TemplateEditorPage from './pages/templates/TemplateEditorPage';
import ContractsListPage from './pages/contracts/ContractsListPage';
import ContractCreatePage from './pages/contracts/ContractCreatePage';
import ContractDetailPage from './pages/contracts/ContractDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="clients" element={<ClientsListPage />} />
                <Route path="templates" element={<TemplatesListPage />} />
                <Route path="templates/new" element={<TemplateEditorPage />} />
                <Route path="templates/:id/edit" element={<TemplateEditorPage />} />
                <Route path="contracts" element={<ContractsListPage />} />
                <Route path="contracts/new" element={<ContractCreatePage />} />
                <Route path="contracts/:id" element={<ContractDetailPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
