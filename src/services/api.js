import { getAuthHeaders, getRefreshToken, getToken, removeToken, setToken } from './auth';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
let refreshInFlight;

function notifyUnauthenticated() {
  window.dispatchEvent(new Event('incuva:unauthenticated'));
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(refreshToken) },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data?.access_token) return null;
      setToken(data.access_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function send(path, options, accessToken = getToken()) {
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? getAuthHeaders(accessToken) : {}),
    ...(options.headers || {}),
  };
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function request(path, options = {}, { authRetry = true } = {}) {
  let response = await send(path, options);
  const isPublicAuthRequest = path.endsWith('/auth/login') || path.endsWith('/auth/register');

  if (response.status === 401 && authRetry && !isPublicAuthRequest && getRefreshToken()) {
    const accessToken = await refreshAccessToken();
    if (accessToken) response = await send(path, options, accessToken);
  }

  if (response.status === 401 && !isPublicAuthRequest) {
    removeToken();
    notifyUnauthenticated();
  }
  return parseResponse(response);
}

export const getEmployees = (params = {}) => {
  const query = new URLSearchParams(params);
  return request(`/v1/employees${query.size ? `?${query}` : ''}`);
};
export const getEmployee = (id) => request(`/v1/employees/${encodeURIComponent(id)}`);
export const getEmployeeAbsences = (id) => request(`/v1/employees/${id}/absences`);
export const getEmployeeSignals = (id) => request(`/v1/employees/${id}/signals`);
export const predictTurnover = (payload) => request('/v1/predict-turnover', { method: 'POST', body: JSON.stringify(payload) });
export const getRiskScores = () => request('/v1/risk-scores');
export const analyzeMeeting = (payload) => request('/v1/meeting-analyze', { method: 'POST', body: JSON.stringify(payload) });
export const getMeetings = () => request('/v1/meetings');
export const getOnboardingPlans = () => request('/v1/onboarding/plans');
export const createOnboardingPlan = (payload) => request('/v1/onboarding/plans', { method: 'POST', body: JSON.stringify(payload) });
export const addOnboardingTask = (planId, payload) => request(`/v1/onboarding/plans/${planId}/tasks`, { method: 'POST', body: JSON.stringify(payload) });
export const updateOnboardingTask = (taskId, status) => request(`/v1/onboarding/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const reviewMeeting = (id, reviewed) => request(`/v1/meetings/${id}/review`, { method: 'PATCH', body: JSON.stringify({ reviewed }) });
export const getInsights = () => request('/v1/insights/latest');
export const login = (credentials) => request('/v1/auth/login', { method: 'POST', body: JSON.stringify(credentials) }, { authRetry: false });
export const register = (details) => request('/v1/auth/register', { method: 'POST', body: JSON.stringify(details) }, { authRetry: false });
export const getCurrentUser = () => request('/v1/auth/me');
export const logout = () => request('/v1/auth/logout', { method: 'POST', body: '{}' });
export const changePassword = (payload) => request('/v1/auth/password', { method: 'PATCH', body: JSON.stringify(payload) });
export const getAuthSessions = () => request('/v1/auth/sessions');
export const revokeAuthSession = (id) => request(`/v1/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const getIntegrations = () => request('/v1/integrations');
export const saveIntegrationCredentials = (key, credentials) => request(`/v1/integrations/${encodeURIComponent(key)}/credentials`, { method: 'PUT', body: JSON.stringify({ credentials }) });
export const deleteIntegrationCredentials = (key) => request(`/v1/integrations/${encodeURIComponent(key)}/credentials`, { method: 'DELETE', body: '{}' });
export const testBambooHRConnection = () => request('/v1/integrations/bamboohr/test', { method: 'POST', body: '{}' });
export const startBambooHRSync = () => request('/v1/integrations/bamboohr/sync', { method: 'POST', body: '{}' });
export const getBambooHRSyncStatus = () => request('/v1/integrations/bamboohr/sync');
export const testFrappeHRConnection = () => request('/v1/integrations/frappehr/test', { method: 'POST', body: '{}' });
export const startFrappeHRSync = () => request('/v1/integrations/frappehr/sync', { method: 'POST', body: '{}' });
export const getFrappeHRSyncStatus = () => request('/v1/integrations/frappehr/sync');
export const getGovernanceBudgets = () => request('/v1/governance/budgets');
export const createGovernanceBudget = (payload) => request('/v1/governance/budgets', { method: 'POST', body: JSON.stringify(payload) });
export const updateGovernanceBudget = (id, payload) => request(`/v1/governance/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const getRetentionPolicy = () => request('/v1/governance/retention');
export const saveRetentionPolicy = (payload) => request('/v1/governance/retention', { method: 'PUT', body: JSON.stringify(payload) });
export const previewRetentionPurge = () => request('/v1/governance/retention/preview');
export const getGovernanceApprovals = (status = 'pending') => request(`/v1/governance/approvals?status=${encodeURIComponent(status)}`);
export const reviewGovernanceApproval = (id, decision, note = '') => request(`/v1/governance/approvals/${id}`, { method: 'PATCH', body: JSON.stringify({ decision, note }) });
export const getGovernanceControls = () => request('/v1/governance/controls');
export const saveGovernanceControl = (key, payload) => request(`/v1/governance/controls/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(payload) });
export const getGovernanceAuditEvents = (params = {}) => request(`/v1/governance/audit-events?${new URLSearchParams(params)}`);
export const getGovernanceRules = () => request('/v1/governance/access-rules');
export const saveGovernanceRule = (payload) => request('/v1/governance/access-rules', { method: 'POST', body: JSON.stringify(payload) });
export const getOrganizationUsers = () => request('/v1/governance/users');
export const createOrganizationUser = (payload) => request('/v1/governance/users', { method: 'POST', body: JSON.stringify(payload) });
export const updateOrganizationUserRole = (id, role) => request(`/v1/governance/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
