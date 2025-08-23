import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type AuthState = {
  userId: string | null;
  orgId: string | null;
  phone: string | null;
  token: string | null; // reserved for future
  loading: boolean;
  onboarded: boolean;
  login: (input: { phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  setOnboarded: () => Promise<void>;
};

const KEYS = {
  auth: 'auth_v1',
  onboarded: 'onboarded_v1',
};

let inMemory: Partial<AuthState> | null = null;

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export const useAuth = create<AuthState>((set, get) => ({
  userId: null,
  orgId: null,
  phone: null,
  token: null,
  loading: false,
  onboarded: false,
  async login({ phone, password }) {
    set({ loading: true });
    const normalized = normalizePhone(phone);
    // Dev mode: we don't have real token endpoint wired yet. Accept any password.
    // Map phone to userId, and fixed orgId for now.
    const userId = normalized; // simple mapping for dev
    const orgId = 'dev-org';
    const auth = { userId, orgId, phone: normalized, token: null };
    inMemory = auth as Partial<AuthState>;
    await SecureStore.setItemAsync(KEYS.auth, JSON.stringify(auth));
    set({ ...auth, loading: false });
  },
  async logout() {
    inMemory = null;
    await SecureStore.deleteItemAsync(KEYS.auth);
    set({ userId: null, orgId: null, phone: null, token: null });
  },
  async setOnboarded() {
    await SecureStore.setItemAsync(KEYS.onboarded, '1');
    set({ onboarded: true });
  },
}));

// bootstrap persisted state
(async () => {
  try {
    const [authRaw, onboarded] = await Promise.all([
      SecureStore.getItemAsync(KEYS.auth),
      SecureStore.getItemAsync(KEYS.onboarded),
    ]);
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      inMemory = parsed;
      useAuth.setState({ ...parsed });
    }
    if (onboarded) useAuth.setState({ onboarded: true });
  } catch {}
})();

export function getAuthHeaders() {
  const state = inMemory || useAuth.getState();
  const headers: Record<string, string> = {};
  if (state.userId) headers['x-user-id'] = state.userId;
  if (state.orgId) headers['x-org-id'] = state.orgId;
  if (state.token) headers['authorization'] = `Bearer ${state.token}`;
  return headers;
}
