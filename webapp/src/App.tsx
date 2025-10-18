import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import TimeEntriesPage from './pages/TimeEntriesPage';
import PayrollsPage from './pages/PayrollsPage';
import AgreementsPage from './pages/AgreementsPage';
import CalculationProfilesPage from './pages/CalculationProfilesPage';
import ConflictsPage from './pages/ConflictsPage';
import Layout from './components/Layout';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Box id="root">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {isAuthenticated ? (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="time-entries" element={<TimeEntriesPage />} />
            <Route path="payrolls" element={<PayrollsPage />} />
            <Route path="calculation-profiles" element={<CalculationProfilesPage />} />
            <Route path="conflicts" element={<ConflictsPage />} />
            <Route path="agreements" element={<AgreementsPage />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Box>
  );
}

export default App;
