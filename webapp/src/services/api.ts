import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Time Entries
export const timeEntriesAPI = {
  list: (params?: any) => api.get('/time-entries', { params }),
  get: (id: string) => api.get(`/time-entries/${id}`),
  create: (data: any) => api.post('/time-entries', data),
  update: (id: string, data: any) => api.put(`/time-entries/${id}`, data),
  approve: (id: string) => api.patch(`/time-entries/${id}/approve`),
  delete: (id: string) => api.delete(`/time-entries/${id}`),
};

// Payrolls
export const payrollsAPI = {
  list: (params?: any) => api.get('/payrolls', { params }),
  get: (id: string) => api.get(`/payrolls/${id}`),
  calculate: (data: any) => api.post('/payrolls/calculate', data),
  calculateBatch: (data: any) => api.post('/payrolls/calculate/batch', data),
  updateStatus: (id: string, status: string, comment?: string) =>
    api.patch(`/payrolls/${id}/status`, { status, comment }),
  delete: (id: string) => api.delete(`/payrolls/${id}`),
};

// Employees
export const employeesAPI = {
  list: (params?: any) => api.get('/employees', { params }),
  get: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Agreements
export const agreementsAPI = {
  list: (params?: any) => api.get('/agreements', { params }),
  get: (id: string) => api.get(`/agreements/${id}`),
  create: (data: any) => api.post('/agreements', data),
  update: (id: string, data: any) => api.put(`/agreements/${id}`, data),
  toggleStatus: (id: string) => api.patch(`/agreements/${id}/toggle-status`),
  delete: (id: string) => api.delete(`/agreements/${id}`),
};

// Export
export const exportAPI = {
  toEconomic: (payrollId: string) => api.post(`/export/economic/${payrollId}`),
  testEconomicConnection: () => api.get('/export/economic/test-connection'),
  toDanlon: (payrollId: string) => api.get(`/export/danlon/${payrollId}`, { responseType: 'blob' }),
  multipleToDanlon: (payrollIds: string[]) =>
    api.post('/export/danlon/multiple', { payrollIds }, { responseType: 'blob' }),
};

// Calculation Profiles
export const calculationProfilesAPI = {
  list: () => api.get('/calculation-profiles'),
  get: (id: string) => api.get(`/calculation-profiles/${id}`),
  create: (data: any) => api.post('/calculation-profiles', data),
  update: (id: string, data: any) => api.put(`/calculation-profiles/${id}`, data),
  delete: (id: string) => api.delete(`/calculation-profiles/${id}`),
  getStats: () => api.get('/calculation-profiles/stats'),
};

// Conflicts
export const conflictsAPI = {
  list: (params?: any) => api.get('/conflicts', { params }),
  get: (id: string) => api.get(`/conflicts/${id}`),
  resolve: (id: string, data: any) => api.post(`/conflicts/${id}/resolve`, data),
  reject: (id: string, note?: string) => api.post(`/conflicts/${id}/reject`, { note }),
  batchApprove: (conflictIds: string[]) => api.post('/conflicts/batch-approve', { conflictIds }),
  getStats: (params?: any) => api.get('/conflicts/stats', { params }),
};

// Import
export const importAPI = {
  importEmployees: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/employees', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  downloadTemplate: () => api.get('/import/template', { responseType: 'blob' }),
};

// Reports
export const reportsAPI = {
  getPayrollSummary: (params?: any) => api.get('/reports/payroll-summary', { params }),
  getPayrollSummaryCSV: (params?: any) =>
    api.get('/reports/payroll-summary', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
  getTimeEntries: (params?: any) => api.get('/reports/time-entries', { params }),
  getTimeEntriesCSV: (params?: any) =>
    api.get('/reports/time-entries', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
  getEmployeeHours: (params?: any) => api.get('/reports/employee-hours', { params }),
  getEmployeeHoursCSV: (params?: any) =>
    api.get('/reports/employee-hours', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
  getDeviations: (params?: any) => api.get('/reports/deviations', { params }),
  getDeviationsCSV: (params?: any) =>
    api.get('/reports/deviations', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
  getSalaryCost: (params?: any) => api.get('/reports/salary-cost', { params }),
  getSalaryCostCSV: (params?: any) =>
    api.get('/reports/salary-cost', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
};

// Audit Logs
export const auditLogsAPI = {
  list: (params?: any) => api.get('/audit-logs', { params }),
  getStats: () => api.get('/audit-logs/stats'),
};

// Subscriptions
export const subscriptionAPI = {
  get: () => api.get('/subscription'),
  create: (data: { paymentMethodId: string; priceId: string }) =>
    api.post('/subscription', data),
  cancel: (immediately?: boolean) =>
    api.post('/subscription/cancel', { immediately }),
  reactivate: () => api.post('/subscription/reactivate'),
  updatePaymentMethod: (paymentMethodId: string) =>
    api.post('/subscription/payment-method', { paymentMethodId }),
  getInvoices: () => api.get('/subscription/invoices'),
  getStripeConfig: () => api.get('/subscription/config'),
  createCheckoutSession: (priceId: string) =>
    api.post('/subscription/checkout-session', { priceId }),
};

// Onboarding
export const onboardingAPI = {
  getStatus: () => api.get('/onboarding/status'),
  completeStep: (stepId: number) => api.post('/onboarding/complete-step', { stepId }),
  skip: () => api.post('/onboarding/skip'),
  complete: () => api.post('/onboarding/complete'),
};

// API Keys
export const apiKeysAPI = {
  list: () => api.get('/api-keys'),
  create: (data: any) => api.post('/api-keys', data),
  deactivate: (id: string) => api.patch(`/api-keys/${id}/deactivate`),
  delete: (id: string) => api.delete(`/api-keys/${id}`),
};

// Geofences
export const geofencesAPI = {
  list: (params?: any) => api.get('/geofences', { params }),
  get: (id: string) => api.get(`/geofences/${id}`),
  create: (data: any) => api.post('/geofences', data),
  update: (id: string, data: any) => api.put(`/geofences/${id}`, data),
  delete: (id: string) => api.delete(`/geofences/${id}`),
};
