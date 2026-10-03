const configuredApiUrl =
  process.env.NEXT_PUBLIC_PHP_API_URL ??
  "http://localhost/INVEST%20PR/backend/public/index.php";

const API_URL = configuredApiUrl.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type UserRole = "user" | "admin" | "super_admin";

export type SessionUser = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  status: "pending" | "active" | "suspended" | "disabled" | "closed";
  roles: UserRole[];
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
};

export type DashboardSummary = {
  openSupportTickets: number;
  unreadNotifications: number;
  profileCompletion: number;
  recentActivity: ActivityItem[];
};

export type ActivityItem = {
  id?: number;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  metadata?: unknown;
  created_at: string;
  username?: string | null;
  full_name?: string | null;
};

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  read_at: string | null;
  created_at: string;
  user_id?: number | null;
  username?: string | null;
};

export type SupportMessage = {
  id: number;
  ticket_id: number;
  author_user_id: number | null;
  author_type: "user" | "admin" | "system";
  body: string;
  is_internal: number;
  created_at: string;
};

export type SupportTicket = {
  id: number;
  user_id: number;
  assigned_to?: number | null;
  subject: string;
  status: "open" | "in_progress" | "waiting_for_user" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  last_message_at: string;
  created_at: string;
  updated_at: string;
  username?: string;
  full_name?: string;
  email?: string;
  message_count?: number;
  messages?: SupportMessage[];
};

export type AdminUser = {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  status: SessionUser["status"];
  roles: UserRole[];
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HyipPreflight = {
  status: "staged";
  adminEntryFound: boolean;
  publicEntryFound: boolean;
  settingsFileFound: boolean;
  installerFound: boolean;
  ionCubeEncoded: boolean;
  ionCubeLoaderAvailable: boolean;
  phpVersion: string;
  financialFeatureMarkers: string[];
  blockers: string[];
  activated: false;
};

export type HyipImport = {
  id: string;
  originalName: string;
  sha256: string;
  size: number;
  entryCount: number;
  skippedAccessFiles: number;
  stagedAt: string;
  preflight: HyipPreflight;
};

// ─── Financial Types ──────────────────────────────────────────────────────────

export type FinancialSummary = {
  balance: number;
  currency: string;
  totalDeposited: number;
  totalWithdrawn: number;
  activeInvested: number;
  totalProfit: number;
  referralEarnings: number;
  totalReferrals: number;
};

export type Transaction = {
  id: number;
  type: "deposit" | "withdrawal" | "investment" | "profit" | "referral_bonus" | "deposit_fee" | "withdrawal_fee" | "adjustment";
  amount: number;
  fee: number;
  balance_before: number;
  balance_after: number;
  reference_id: number | null;
  reference_type: string | null;
  description: string | null;
  status: "pending" | "completed" | "failed" | "cancelled";
  created_at: string;
};

export type InvestmentPlan = {
  id: number;
  name: string;
  description: string | null;
  min_deposit: number;
  max_deposit: number;
  daily_return: number;
  duration_days: number;
  total_return: number;
  is_active: boolean;
  sort_order: number;
};

export type Investment = {
  id: number;
  user_id: number;
  plan_id: number;
  amount: number;
  daily_return: number;
  duration_days: number;
  total_return: number;
  profit_earned: number;
  last_profit_at: string | null;
  starts_at: string;
  ends_at: string;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  plan_name: string;
};

export type Deposit = {
  id: number;
  user_id: number;
  plan_id: number | null;
  plan_name?: string | null;
  amount: number;
  deposit_fee: number;
  credit_amount: number;
  method: string;
  network: string | null;
  reference: string | null;
  payer_account: string | null;
  request_reference: string | null;
  proof_file: string | null;
  evidence_path: string | null;
  admin_note: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Withdrawal = {
  id: number;
  user_id: number;
  amount: number;
  fee: number;
  net_amount: number;
  method: string;
  wallet_address: string;
  admin_note: string | null;
  status: "pending" | "approved" | "rejected" | "paid";
  reviewed_by: number | null;
  reviewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Referral = {
  id: number;
  referrer_id: number;
  referred_id: number;
  commission_rate: number;
  total_earned: number;
  created_at: string;
  username: string;
  full_name: string;
  email: string;
  joined_at: string;
};

export type ReferralStats = {
  totalReferrals: number;
  totalEarned: number;
};

export type AdminFinancialStats = {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  pendingDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalInvested: number;
  totalProfitPaid: number;
  totalReferralBonuses: number;
};

let csrfToken: string | null = null;

function apiUrl(route: string, params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams({ route });
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return `${API_URL}?${query.toString()}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: T; error?: { message?: string; fields?: Record<string, string> } }
    | null;

  if (!response.ok || !payload?.ok) {
    if (response.status === 401) csrfToken = null;
    throw new ApiError(
      payload?.error?.message ?? "The request could not be completed.",
      response.status,
      payload?.error?.fields ?? {},
    );
  }

  return payload.data as T;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(apiUrl("auth/csrf"), {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const data = await readResponse<{ csrf_token: string }>(response);
  csrfToken = data.csrf_token;
  return csrfToken;
}

async function request<T>(
  route: string,
  options: RequestInit & {
    params?: Record<string, string | number | undefined>;
    csrfRetried?: boolean;
  } = {},
): Promise<T> {
  const { params, csrfRetried = false, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const headers = new Headers(fetchOptions.headers);
  headers.set("Accept", "application/json");

  if (fetchOptions.body && !(typeof FormData !== "undefined" && fetchOptions.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (mutating) {
    headers.set("X-CSRF-Token", await getCsrfToken());
  }

  const response = await fetch(apiUrl(route, params), {
    ...fetchOptions,
    method,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  // The server rejects a stale or missing token with 428. The token is bound
  // to the PHP session, so it goes stale whenever the session is rotated or
  // destroyed. Drop the cached copy and replay the request once, which keeps a
  // revoked-session reload from failing every later mutation.
  if (mutating && response.status === 428 && !csrfRetried) {
    csrfToken = null;
    return request<T>(route, { ...options, params, csrfRetried: true });
  }

  return readResponse<T>(response);
}

function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export const phpApi = {
  getCsrfToken,
  async health() {
    return request<{ service: string; database: string }>("health");
  },
  async currentUser() {
    return request<{ user: SessionUser }>("auth/me");
  },
  async login(identifier: string, password: string) {
    csrfToken = null;
    const result = await request<{ user: SessionUser }>("auth/login", {
      method: "POST",
      body: jsonBody({ identifier, password }),
    });
    csrfToken = null;
    return result;
  },
  async adminLogin(identifier: string, password: string) {
    csrfToken = null;
    const result = await request<{ user: SessionUser }>("admin/login", {
      method: "POST",
      body: jsonBody({ identifier, password }),
    });
    csrfToken = null;
    return result;
  },
  async register(input: {
    full_name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    password_confirmation: string;
  }) {
    const result = await request<{ user: SessionUser }>("auth/register", {
      method: "POST",
      body: jsonBody(input),
    });
    csrfToken = null;
    return result;
  },
  async logout() {
    try {
      return await request<{ logged_out: boolean }>("auth/logout", {
        method: "POST",
        body: jsonBody({}),
      });
    } finally {
      csrfToken = null;
    }
  },
  async changePassword(input: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) {
    return request<{ updated: boolean }>("auth/change-password", {
      method: "POST",
      body: jsonBody(input),
    });
  },
  async forgotPassword(email: string) {
    return request<{ message: string }>("auth/forgot-password", {
      method: "POST",
      body: jsonBody({ email }),
    });
  },
  async resetPassword(input: {
    token: string;
    password: string;
    password_confirmation: string;
  }) {
    return request<{ message: string }>("auth/reset-password", {
      method: "POST",
      body: jsonBody(input),
    });
  },
  async dashboard() {
    return request<{ summary: DashboardSummary }>("user/dashboard");
  },
  async profile() {
    return request<{ user: SessionUser }>("user/profile");
  },
  async updateProfile(input: { full_name: string; phone: string }) {
    return request<{ user: SessionUser }>("user/profile", {
      method: "PATCH",
      body: jsonBody(input),
    });
  },
  async notifications() {
    return request<{ notifications: NotificationItem[] }>("user/notifications");
  },
  async markNotificationRead(id: number) {
    return request<{ updated: boolean }>("user/notifications/read", {
      method: "POST",
      body: jsonBody({ id }),
    });
  },
  async activity() {
    return request<{ activity: ActivityItem[] }>("user/activity");
  },
  async supportTickets() {
    return request<{ tickets: { items: SupportTicket[]; total: number } }>("user/support");
  },
  async supportTicket(id: number) {
    return request<{ ticket: SupportTicket }>("user/support/ticket", { params: { id } });
  },
  async createSupportTicket(input: { subject: string; message: string }) {
    return request<{ ticket: SupportTicket }>("user/support", {
      method: "POST",
      body: jsonBody(input),
    });
  },
  async replyToSupport(input: { ticket_id: number; message: string }) {
    return request<{ ticket: SupportTicket }>("user/support/reply", {
      method: "POST",
      body: jsonBody(input),
    });
  },
  async adminDashboard() {
    return request<{
      dashboard: {
        counts: Record<string, number>;
        recentActivity: ActivityItem[];
        openTickets: SupportTicket[];
      };
    }>("admin/dashboard");
  },
  async adminUsers(params: { search?: string; status?: string; page?: number; limit?: number } = {}) {
    return request<{ users: { items: AdminUser[]; total: number; page: number; limit: number } }>(
      "admin/users/list",
      { params },
    );
  },
  async adminUser(id: number) {
    return request<{
      detail: {
        user: SessionUser;
        openSupportTickets: number;
        unreadNotifications: number;
        recentActivity: ActivityItem[];
      };
    }>("admin/user", { params: { id } });
  },
  async updateAdminUser(id: number, input: { full_name?: string; phone?: string }) {
    return request<{ user: SessionUser }>("admin/users/update", {
      method: "PATCH",
      params: { id },
      body: jsonBody(input),
    });
  },
  async setAdminUserStatus(userId: number, status: SessionUser["status"]) {
    return request<{ updated: boolean }>("admin/users/status", {
      method: "POST",
      body: jsonBody({ user_id: userId, status }),
    });
  },
  async adminUserDetail(id: number) {
    return request<{
      detail: {
        user: SessionUser;
        openSupportTickets: number;
        unreadNotifications: number;
        recentActivity: ActivityItem[];
        notes: Array<{ id: number; note: string; created_at: string; admin_name: string }>;
      };
    }>("admin/user-detail", { params: { id } });
  },
  async adminAddUserNote(input: { user_id: number; note: string }) {
    return request<{ note: { id: number; note: string; created_at: string } }>(
      "admin/users/notes",
      { method: "POST", body: jsonBody(input) },
    );
  },
  async adminLoginHistory(params: { user_id?: number; limit?: number } = {}) {
    return request<{ attempts: Array<{ id: number; identifier: string; success: boolean; ip_address: string | null; created_at: string }> }>(
      "admin/security/login-history",
      { params },
    );
  },
  async adminSecurityEvents(limit = 50) {
    return request<{ events: Array<{ id: number; event_type: string; created_at: string }> }>(
      "admin/security/events",
      { params: { limit } },
    );
  },
  async adminAuditLog(params: { page?: number; limit?: number } = {}) {
    return request<{ audit: { items: Array<Record<string, unknown>>; total: number; page: number } }>(
      "admin/audit-log",
      { params },
    );
  },

  async adminSupportList(params: { search?: string; status?: string; page?: number; limit?: number } = {}) {
    return request<{ tickets: { items: SupportTicket[]; total: number; page: number } }>(
      "admin/support/list",
      { params },
    );
  },

  async adminSupportTicket(id: number) {
    return request<{ ticket: SupportTicket }>("admin/support/ticket", { params: { id } });
  },

  async adminSupportReply(input: { ticket_id: number; message: string; internal?: boolean }) {
    return request<{ ticket: SupportTicket }>("admin/support/reply", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminSupportStatus(input: { ticket_id: number; status: SupportTicket["status"] }) {
    return request<{ updated: boolean }>("admin/support/status", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminSupportPriority(input: { ticket_id: number; priority: SupportTicket["priority"] }) {
    return request<{ updated: boolean }>("admin/support/priority", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminSupportAssignees() {
    return request<{ assignees: Array<{ id: number; full_name: string; username: string }> }>(
      "admin/support/assignees",
    );
  },

  async adminSupportAssign(input: { ticket_id: number; assigned_to: number }) {
    return request<{ updated: boolean }>("admin/support/assign", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminNotificationsList(limit = 50) {
    return request<{ notifications: NotificationItem[] }>("admin/notifications/list", {
      params: { limit },
    });
  },

  async adminAnnouncements() {
    return request<{ announcements: Array<{ id: number; title: string; message: string; is_dismissible: number; starts_at: string | null; ends_at: string | null }> }>(
      "admin/announcements",
    );
  },

  async adminCreateAnnouncement(input: { title: string; message: string; is_dismissible?: boolean; starts_at?: string; ends_at?: string }) {
    return request<{ announcement: { id: number; title: string; message: string } }>(
      "admin/announcements",
      { method: "POST", body: jsonBody(input) },
    );
  },

  async adminMarkContactRead(id: number) {
    return request<{ updated: boolean }>("admin/communication/mark-read", {
      method: "POST",
      body: jsonBody({ id }),
    });
  },

  async adminEmailLogs(limit = 50) {
    return request<{ logs: Array<{ id: number; recipient: string; subject: string; status: string; error: string | null; notification_type: string; sent_at: string }> }>(
      "admin/email/logs",
      { params: { limit } },
    );
  },

  async adminFailedLogins(hours = 24) {
    return request<{ failed: Array<{ identifier: string; attempts: number; last_attempt: string }> }>(
      "admin/security/failed-logins",
      { params: { hours } },
    );
  },

  async adminSystemInfo() {
    return request<{ info: Record<string, unknown> }>("admin/system/info");
  },

  async adminSystemHealthChecks() {
    return request<{ checks: Record<string, { ok: boolean; label: string; warn?: boolean }> }>("admin/system/health");
  },

  async adminSystemBackups() {
    return request<{ backups: Array<{ id: number; filename: string; size: number; status: string; created_at: string }> }>(
      "admin/system/backup",
    );
  },

  async adminCreateBackup() {
    return request<{ backup: { filename: string; size: number; path: string } }>(
      "admin/system/backup",
      { method: "POST", body: jsonBody({}) },
    );
  },

  async adminUpdateReferralSettings(input: Record<string, string>) {
    return request<{ settings: Record<string, { value: string; type: string; updated_at: string }> }>(
      "admin/referral/settings",
      { method: "PATCH", body: jsonBody(input) },
    );
  },

  async adminReferralStats() {
    return request<{ stats: Record<string, unknown> }>("admin/referral/stats");
  },

  async adminPaymentMethods() {
    return request<{ methods: Array<Record<string, unknown>> }>("admin/payment-methods");
  },

  async adminCreatePaymentMethod(input: {
    method_key: string;
    display_name: string;
    description?: string;
    icon_path?: string;
    display_order?: number;
    is_enabled?: boolean;
    is_sandbox?: boolean;
    supported_currencies?: string;
    public_instructions?: string;
    wallet_address?: string;
    status?: "active" | "archived";
  }) {
    return request<{ method: Record<string, unknown> }>("admin/payment-methods", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminUpdatePaymentMethod(id: number, input: {
    display_name?: string;
    description?: string;
    icon_path?: string;
    display_order?: number;
    is_enabled?: boolean;
    is_sandbox?: boolean;
    supported_currencies?: string;
    public_instructions?: string;
    wallet_address?: string;
    status?: "active" | "archived";
  }) {
    return request<{ method: Record<string, unknown> }>("admin/payment-methods", {
      method: "PATCH",
      params: { id },
      body: jsonBody(input),
    });
  },

  async adminArchivePaymentMethod(id: number) {
    return request<{ archived: boolean }>("admin/payment-methods", {
      method: "DELETE",
      params: { id },
      body: jsonBody({}),
    });
  },

  async adminRestorePaymentMethod(id: number) {
    return request<{ method: Record<string, unknown> }>("admin/payment-methods", {
      method: "POST",
      params: { id, action: "restore" },
      body: jsonBody({}),
    });
  },

  async adminBonuses() {
    return request<{ bonuses: Array<Record<string, unknown>> }>("admin/bonuses");
  },

  async adminCreateBonus(input: {
    title: string;
    description?: string;
    badge_label?: string;
    demo_points?: number;
    is_active?: boolean;
    starts_at?: string;
    ends_at?: string;
    eligibility_description?: string;
    user_terms?: string;
  }) {
    return request<{ bonus: Record<string, unknown> }>("admin/bonuses", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminUpdateBonus(id: number, input: {
    title?: string;
    description?: string;
    badge_label?: string;
    demo_points?: number;
    is_active?: boolean;
    starts_at?: string;
    ends_at?: string;
    eligibility_description?: string;
    user_terms?: string;
  }) {
    return request<{ bonus: Record<string, unknown> }>("admin/bonuses", {
      method: "PATCH",
      params: { id },
      body: jsonBody(input),
    });
  },

  async adminToggleBonus(id: number) {
    return request<{ bonus: Record<string, unknown> }>("admin/bonuses", {
      method: "POST",
      params: { id, action: "toggle" },
      body: jsonBody({}),
    });
  },

  async adminDeleteBonus(id: number) {
    return request<{ deleted: boolean }>("admin/bonuses", {
      method: "DELETE",
      params: { id },
      body: jsonBody({}),
    });
  },

  async adminHomepageSections() {
    return request<{ sections: Array<Record<string, unknown>> }>("admin/content/homepage");
  },

  async adminUpdateHomepageSection(id: number, input: Record<string, unknown>) {
    return request<{ section: Record<string, unknown> }>("admin/content/homepage", {
      method: "PATCH",
      params: { id },
      body: jsonBody(input),
    });
  },

  async adminBanners() {
    return request<{ banners: Array<Record<string, unknown>> }>("admin/content/banners");
  },

  async adminCreateBanner(input: Record<string, unknown>) {
    return request<{ banner: Record<string, unknown> }>("admin/content/banners", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminUpdateBanner(id: number, input: Record<string, unknown>) {
    return request<{ banner: Record<string, unknown> }>("admin/content/banners", {
      method: "PATCH",
      params: { id },
      body: jsonBody(input),
    });
  },

  async adminDeleteBanner(id: number) {
    return request<{ deleted: boolean }>("admin/content/banners", {
      method: "DELETE",
      params: { id },
      body: jsonBody({}),
    });
  },

  async adminDiagnostics() {
    return request<{ diagnostics: Record<string, unknown> }>("admin/system/diagnostics");
  },

  async adminScheduledTasks() {
    return request<{ tasks: Array<Record<string, unknown>> }>("admin/system/scheduled-tasks");
  },
  async adminSupportTickets(params: { search?: string; status?: string; page?: number } = {}) {
    return request<{ tickets: { items: SupportTicket[]; total: number; page: number } }>(
      "admin/support",
      { params },
    );
  },
  async replyToAdminSupport(input: {
    ticket_id: number;
    message: string;
    internal?: boolean;
  }) {
    return request<{ ticket: SupportTicket }>("admin/support/reply", {
      method: "POST",
      body: jsonBody(input),
    });
  },
  async setAdminSupportStatus(ticketId: number, status: SupportTicket["status"]) {
    return request<{ updated: boolean }>("admin/support/status", {
      method: "POST",
      body: jsonBody({ ticket_id: ticketId, status }),
    });
  },
  async adminNotifications() {
    return request<{ notifications: NotificationItem[] }>("admin/notifications");
  },
  async createAdminNotification(input: { title: string; message: string; user_id?: number | null }) {
    return request<{ created: boolean }>("admin/notifications", {
      method: "POST",
      body: jsonBody(input),
    });
  },
  async hyipImports() {
    return request<{ imports: HyipImport[] }>("admin/hyip/status");
  },
  async importHyipArchive(file: File) {
    const form = new FormData();
    form.append("archive", file, file.name);
    return request<{ import: HyipImport }>("admin/hyip/import", {
      method: "POST",
      body: form,
    });
  },
  async adminContent() {
    return request<{ settings: Array<Record<string, unknown>> }>("admin/content");
  },
  async updateAdminContent(input: Record<string, string>) {
    return request<{ settings: Array<Record<string, unknown>> }>("admin/content", {
      method: "PATCH",
      body: jsonBody(input),
    });
  },
  async adminActivity() {
    return request<{ activity: ActivityItem[] }>("admin/activity");
  },

  // ─── Financial ─────────────────────────────────────────────────────────────

  async financialSummary() {
    return request<{ summary: FinancialSummary }>("user/finance/summary");
  },

  async transactions(params: { page?: number; limit?: number; type?: string } = {}) {
    return request<{ transactions: { items: Transaction[]; total: number; page: number; limit: number } }>(
      "user/finance/transactions",
      { params },
    );
  },

  async investmentPlans() {
    return request<{ plans: InvestmentPlan[] }>("user/finance/plans");
  },

  async createInvestment(input: { plan_id: number; amount: number }) {
    return request<{ investment: Investment }>("user/finance/invest", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async investments(params: { page?: number; limit?: number; status?: string } = {}) {
    return request<{ investments: { items: Investment[]; total: number; page: number; limit: number } }>(
      "user/finance/investments",
      { params },
    );
  },

  async createDeposit(input: {
    plan_id: number;
    amount: number;
    network_id: number;
    reference?: string;
    payer_account?: string;
    evidence?: File;
    idempotency_key?: string;
  }) {
    if (input.evidence) {
      const form = new FormData();
      form.append("plan_id", String(input.plan_id));
      form.append("amount", String(input.amount));
      form.append("network_id", String(input.network_id));
      if (input.reference) form.append("reference", input.reference);
      if (input.payer_account) form.append("payer_account", input.payer_account);
      if (input.idempotency_key) form.append("idempotency_key", input.idempotency_key);
      form.append("evidence", input.evidence);
      return request<{ deposit: Deposit; duplicate?: boolean }>("user/finance/deposit", {
        method: "POST",
        body: form,
      });
    }
    return request<{ deposit: Deposit; duplicate?: boolean }>("user/finance/deposit", {
      method: "POST",
      body: jsonBody({
        plan_id: input.plan_id,
        amount: input.amount,
        network_id: input.network_id,
        reference: input.reference,
        payer_account: input.payer_account,
        idempotency_key: input.idempotency_key,
      }),
    });
  },

  async deposits(params: { page?: number; limit?: number; status?: string } = {}) {
    return request<{ deposits: { items: Deposit[]; total: number; page: number; limit: number } }>(
      "user/finance/deposits",
      { params },
    );
  },

  async cryptoNetworks() {
    return request<{ networks: Array<{ id: number; network_key: string; display_name: string; currency_symbol: string; description: string | null; wallet_address: string | null; qr_code_path: string | null; is_enabled: boolean; display_order: number; min_deposit: number | null; max_deposit: number | null; payment_instructions?: string | null }> }>(
      "crypto/networks",
    );
  },

  async createWithdrawal(input: { amount: number; method: string; wallet_address: string }) {
    return request<{ withdrawal: Withdrawal }>("user/finance/withdraw", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async withdrawals(params: { page?: number; limit?: number; status?: string } = {}) {
    return request<{ withdrawals: { items: Withdrawal[]; total: number; page: number; limit: number } }>(
      "user/finance/withdrawals",
      { params },
    );
  },

  async referrals(params: { page?: number; limit?: number } = {}) {
    return request<{ referrals: { items: Referral[]; total: number; page: number; limit: number; stats: ReferralStats } }>(
      "user/finance/referrals",
      { params },
    );
  },

  async adminFinancialStats() {
    return request<{ stats: AdminFinancialStats }>("admin/finance/stats");
  },

  async adminInvestmentPlans() {
    return request<{ plans: InvestmentPlan[] }>("admin/finance/plans");
  },

  async adminCreatePlan(input: {
    name: string;
    description?: string;
    min_deposit: number;
    max_deposit: number;
    daily_return: number;
    duration_days: number;
    total_return: number;
    sort_order?: number;
  }) {
    return request<{ plan: InvestmentPlan }>("admin/finance/plans", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminUpdatePlan(id: number, input: Partial<Omit<InvestmentPlan, "id">>) {
    return request<{ plan: InvestmentPlan }>("admin/finance/plan", {
      method: "PATCH",
      params: { id },
      body: jsonBody(input),
    });
  },

  async adminDeposits(params: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    return request<{ deposits: { items: (Deposit & { username: string; full_name: string; email: string })[]; total: number; page: number; limit: number } }>(
      "admin/finance/deposits",
      { params },
    );
  },

  async adminDepositDetail(id: number) {
    return request<{ deposit: Deposit & { username: string; full_name: string; email: string } }>(
      "admin/finance/crypto-deposit",
      { params: { id } },
    );
  },

  async adminReviewDeposit(input: { deposit_id: number; status: "approved" | "rejected"; note?: string }) {
    return request<{ updated: boolean }>("admin/finance/deposit/review", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminWithdrawals(params: { page?: number; limit?: number; status?: string } = {}) {
    return request<{ withdrawals: { items: (Withdrawal & { username: string; full_name: string; email: string })[]; total: number; page: number; limit: number } }>(
      "admin/finance/withdrawals",
      { params },
    );
  },

  async adminReviewWithdrawal(input: { withdrawal_id: number; status: "approved" | "rejected" | "paid"; note?: string }) {
    return request<{ updated: boolean }>("admin/finance/withdrawal/review", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminAdjustBalance(input: { user_id: number; amount: number; type: "credit" | "debit"; description: string }) {
    return request<{ adjusted: boolean }>("admin/finance/adjust", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminProcessProfits() {
    return request<{ processed: number }>("admin/finance/process-profits", {
      method: "POST",
      body: jsonBody({}),
    });
  },

  // ─── Admin Overview & System ──────────────────────────────────────────────

  async adminOverviewStats() {
    return request<{ stats: Record<string, number | string | boolean> }>("admin/overview/stats");
  },

  async adminSystemHealth() {
    return request<{ health: Record<string, unknown> }>("admin/system/health");
  },

  async adminRecentActivity(limit = 15) {
    return request<{ activity: ActivityItem[] }>("admin/activity", { params: { limit } });
  },

  async adminRecentUsers(limit = 5) {
    return request<{ users: Array<{ id: number; username: string; email: string; status: string; created_at: string }> }>(
      "admin/recent-users",
      { params: { limit } },
    );
  },

  async adminRecentTickets(limit = 5) {
    return request<{ tickets: Array<{ id: number; subject: string; status: string; created_at: string; username?: string }> }>(
      "admin/recent-tickets",
      { params: { limit } },
    );
  },

  async adminGetAllSettings() {
    return request<{ settings: Record<string, { value: string; type: string; public: boolean }> }>(
      "admin/settings/all",
    );
  },

  async adminUpdateSettings(input: Record<string, string>) {
    return request<{ settings: Record<string, { value: string; type: string; public: boolean }> }>(
      "admin/settings/update",
      { method: "PATCH", body: jsonBody(input) },
    );
  },

  async adminContentPages() {
    return request<{ pages: Array<{ id: number; slug: string; title: string; body: string; status: string; published_at: string | null; updated_at: string }> }>(
      "admin/content/page",
    );
  },

  async adminContentPage(id: number) {
    return request<{ page: { id: number; slug: string; title: string; body: string; status: string; published_at: string | null } }>(
      "admin/content/page",
      { params: { id } },
    );
  },

  async adminCreateContentPage(input: { slug: string; title: string; body: string; status: "draft" | "published" }) {
    return request<{ page: { id: number; slug: string; title: string; body: string; status: string } }>(
      "admin/content/page",
      { method: "POST", body: jsonBody(input) },
    );
  },

  async adminUpdateContentPage(id: number, input: { title?: string; body?: string; status?: "draft" | "published" }) {
    return request<{ page: { id: number; slug: string; title: string; body: string; status: string } }>(
      "admin/content/page",
      { method: "PATCH", params: { id }, body: jsonBody(input) },
    );
  },

  async adminDeleteContentPage(id: number) {
    return request<{ deleted: boolean }>("admin/content/page", {
      method: "DELETE",
      params: { id },
      body: jsonBody({}),
    });
  },

  async adminNewsArticles() {
    return request<{ articles: Array<{ id: number; title: string; slug: string; excerpt: string; status: string; published_at: string | null }> }>(
      "admin/content/news-detail",
    );
  },

  async adminCreateNewsArticle(input: { title: string; slug: string; excerpt?: string; body: string; status: "draft" | "published" }) {
    return request<{ article: { id: number; title: string; slug: string; status: string } }>(
      "admin/content/news-detail",
      { method: "POST", body: jsonBody(input) },
    );
  },

  async adminFaqs() {
    return request<{ faqs: Array<{ id: number; question: string; answer: string; sort_order: number; is_active: boolean }> }>(
      "admin/content/faq-detail",
    );
  },

  async adminCreateFaq(input: { question: string; answer: string; sort_order?: number }) {
    return request<{ faq: { id: number; question: string; answer: string; sort_order: number; is_active: boolean } }>(
      "admin/content/faq-detail",
      { method: "POST", body: jsonBody(input) },
    );
  },

  async adminUpdateFaq(id: number, input: { question?: string; answer?: string; is_active?: boolean }) {
    return request<{ updated: boolean }>("admin/content/faq-detail", {
      method: "PATCH",
      params: { id },
      body: jsonBody(input),
    });
  },

  async adminDeleteFaq(id: number) {
    return request<{ deleted: boolean }>("admin/content/faq-detail", {
      method: "DELETE",
      params: { id },
      body: jsonBody({}),
    });
  },

  async adminSystemLogs(params: { level?: string; channel?: string; limit?: number } = {}) {
    return request<{ logs: Array<{ id: number; level: string; channel: string; message: string; created_at: string }> }>(
      "admin/system/logs",
      { params },
    );
  },

  async adminContactSubmissions() {
    return request<{ submissions: Array<{ id: number; name: string; email: string; subject: string; is_read: boolean; created_at: string }> }>(
      "admin/communication/contact",
    );
  },

  async adminNewsletterSubscribers() {
    return request<{ subscribers: Array<{ id: number; email: string; is_subscribed: boolean; created_at: string }> }>(
      "admin/communication/subscriptions",
    );
  },

  async adminRecords(params: { type?: string; page?: number; limit?: number } = {}) {
    return request<{ records: { items: Array<Record<string, unknown>>; total: number; page: number } }>(
      "admin/records",
      { params },
    );
  },

  async adminAdminAccounts() {
    return request<{ admins: Array<{ id: number; full_name: string; username: string; email: string; roles: string[] }> }>(
      "admin/administration/admins",
    );
  },

  async adminRoles() {
    return request<{ roles: Array<{ id: number; name: string; description: string; permission_count: number }> }>(
      "admin/administration/roles",
    );
  },

  async adminAssignRole(input: { user_id: number; role_id: number }) {
    return request<{ assigned: boolean }>("admin/administration/assign-role", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminRemoveRole(input: { user_id: number; role_id: number }) {
    return request<{ removed: boolean }>("admin/administration/remove-role", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  // ─── Public Payment Methods ────────────────────────────────────────────

  async publicPaymentMethods() {
    return request<{ methods: Array<{ method_key: string; display_name: string; description: string; public_instructions: string; supported_currencies: string }> }>(
      "payment-methods/public",
    );
  },

  // ─── User Search ────────────────────────────────────────────────────────

  async adminSearchUser(query: string) {
    return request<{ users: Array<{ id: number; username: string; full_name: string; email: string; status: string }>; user: { id: number; username: string; full_name: string; email: string; status: string } | null }>(
      "admin/user-search",
      { params: { q: query } },
    );
  },

  // ─── Blacklist ──────────────────────────────────────────────────────────

  async adminBlacklist() {
    return request<{ blacklist: Array<{ id: number; user_id: number; reason: string; created_at: string; username: string; full_name: string; email: string }> }>(
      "admin/blacklist",
    );
  },

  async adminAddToBlacklist(userId: number, reason: string) {
    return request<{ added: boolean }>("admin/blacklist/add", {
      method: "POST",
      body: jsonBody({ user_id: userId, reason }),
    });
  },

  async adminRemoveFromBlacklist(userId: number) {
    return request<{ removed: boolean }>("admin/blacklist/remove", {
      method: "POST",
      body: jsonBody({ user_id: userId }),
    });
  },

  // ─── Exchange Rates ─────────────────────────────────────────────────────

  async adminExchangeRates() {
    return request<{ rates: Array<{ id: number; currency_code: string; currency_name: string; rate: number; is_active: number; display_precision: number; is_default: number }> }>(
      "admin/exchange-rates",
    );
  },

  async adminUpdateExchangeRates(rates: Array<{ currency_code: string; rate: number; display_precision: number; is_active?: number }>) {
    return request<{ rates: Array<Record<string, unknown>> }>("admin/exchange-rates/update", {
      method: "PATCH",
      body: jsonBody({ rates }),
    });
  },

  // ─── Earning Holidays ───────────────────────────────────────────────────

  async adminEarningHolidays() {
    return request<{ holidays: Array<{ id: number; name: string; description: string; start_date: string; end_date: string; is_active: number; created_at: string }> }>(
      "admin/earning-holidays",
    );
  },

  async adminCreateEarningHoliday(input: { name: string; description?: string; start_date: string; end_date: string }) {
    return request<{ id: number }>("admin/earning-holidays/create", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  // ─── Auto-Withdrawal Settings ───────────────────────────────────────────

  async adminAutoWithdrawalSettings() {
    return request<{ settings: Record<string, { value: string; type: string; description: string }> }>(
      "admin/auto-withdrawal/settings",
    );
  },

  async adminUpdateAutoWithdrawalSettings(settings: Record<string, string>) {
    return request<{ updated: boolean }>("admin/auto-withdrawal/settings", {
      method: "PATCH",
      body: jsonBody(settings),
    });
  },

  // ─── Info Boxes ─────────────────────────────────────────────────────────

  async adminInfoBoxes() {
    return request<{ boxes: Array<{ id: number; title: string; message: string; box_type: string; display_location: string; is_visible: number; starts_at: string | null; ends_at: string | null; created_at: string }> }>(
      "admin/info-boxes",
    );
  },

  async adminCreateInfoBox(input: { title: string; message: string; box_type?: string; display_location?: string; is_visible?: boolean; starts_at?: string; ends_at?: string }) {
    return request<{ id: number }>("admin/info-boxes", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  async adminUpdateInfoBox(id: number, input: { title?: string; message?: string; box_type?: string; display_location?: string; is_visible?: boolean; starts_at?: string; ends_at?: string }) {
    return request<{ updated: boolean }>("admin/info-boxes", {
      method: "PATCH",
      body: jsonBody(input),
    });
  },

  async adminDeleteInfoBox(id: number) {
    return request<{ deleted: boolean }>("admin/info-boxes", {
      method: "DELETE",
      body: jsonBody({}),
    });
  },

  // ─── Bonus Records ──────────────────────────────────────────────────────

  async adminBonusRecords(params: { page?: number; limit?: number } = {}) {
    return request<{ records: { items: Array<Record<string, unknown>>; total: number; page: number } }>(
      "admin/bonus-records",
      { params },
    );
  },

  async adminAwardBonus(input: { user_id: number; amount: number; reason: string; bonus_id?: number }) {
    return request<{ awarded: boolean }>("admin/bonus-records", {
      method: "POST",
      body: jsonBody(input),
    });
  },

  // ─── Expiring Deposits ──────────────────────────────────────────────────

  async adminExpiringDeposits(days = 7) {
    return request<{ investments: Array<Record<string, unknown>> }>("admin/expiring-deposits", {
      params: { days },
    });
  },

  // ─── Earnings Ledger ────────────────────────────────────────────────────

  async adminEarnings(params: { page?: number; limit?: number; type?: string } = {}) {
    return request<{ earnings: { items: Array<Record<string, unknown>>; total: number; page: number } }>(
      "admin/earnings",
      { params },
    );
  },

  // ─── Pending Deposits ───────────────────────────────────────────────────

  async adminPendingDeposits(params: { page?: number; limit?: number } = {}) {
    return request<{ deposits: { items: Array<Record<string, unknown>>; total: number; page: number } }>(
      "admin/pending-deposits",
      { params },
    );
  },

  // ─── Deposit Evidence ──────────────────────────────────────────────────

  depositEvidenceUrl(depositId: number) {
    return apiUrl("user/finance/deposit/evidence", { id: depositId });
  },

  adminDepositEvidenceUrl(depositId: number) {
    return apiUrl("admin/finance/deposit/evidence", { id: depositId });
  },
};
