'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { TRPCClientError } from '@trpc/client';
import type { AdminUser, UserRole } from '@awaaz/types';
import { PageHeader } from '@/components/layout/dashboard-layout';
import { trpc } from '@/trpc/client';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatPhone(phone: string) {
  return phone.replace(/^\+91/, '+91 ').replace(/(\d{5})(\d{5})$/, '$1 $2');
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Role badge ───────────────────────────────────────────────────────

const ROLE_STYLES: Record<UserRole, string> = {
  citizen: 'bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]',
  mla: 'bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]',
  admin: 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]',
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role]}`}
    >
      {role}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? 'border border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]'
          : 'border border-[#fecaca] bg-[#fef2f2] text-[#dc2626]'
      }`}
    >
      <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-[#64748b]">{label}</p>
        <p className="text-xl font-bold text-[#0f172a]">{value}</p>
      </div>
    </div>
  );
}

// ─── Action dropdown ─────────────────────────────────────────────────

interface ActionMenuProps {
  user: AdminUser;
  onUpdateRole: (id: string, role: UserRole) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  busy: boolean;
}

function ActionMenu({ user, onUpdateRole, onToggleActive, busy }: ActionMenuProps) {
  const [open, setOpen] = useState(false);

  const roles: UserRole[] = ['citizen', 'mla', 'admin'];
  const otherRoles = roles.filter((r) => r !== user.role);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="rounded-lg p-1.5 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a] disabled:opacity-40"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-[#e2e8f0] bg-white py-1 shadow-lg">
            {/* Role changes */}
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
              Change Role
            </p>
            {otherRoles.map((role) => (
              <button
                key={role}
                onClick={() => {
                  onUpdateRole(user.id, role);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#0f172a] hover:bg-[#f8fafc]"
              >
                <Shield className="h-3.5 w-3.5 text-[#64748b]" />
                Make {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}

            <div className="my-1 border-t border-[#f1f5f9]" />

            {/* Activate / Deactivate */}
            <button
              onClick={() => {
                onToggleActive(user.id, !user.isActive);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#f8fafc] ${
                user.isActive ? 'text-[#dc2626]' : 'text-[#15803d]'
              }`}
            >
              {user.isActive ? (
                <>
                  <UserMinus className="h-3.5 w-3.5" /> Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" /> Activate
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────

type RoleFilter = UserRole | 'all';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // ── Data fetching ──────────────────────────────────────────────────

  const statsQuery = trpc.users.getStats.useQuery(undefined, {
    staleTime: 30_000,
  });

  const listQuery = trpc.users.list.useQuery(
    {
      page,
      limit: 15,
      role: roleFilter === 'all' ? undefined : roleFilter,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      search: debouncedSearch || undefined,
    },
    { staleTime: 10_000 },
  );

  // ── Mutations ─────────────────────────────────────────────────────

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      void utils.users.list.invalidate();
      void utils.users.getStats.invalidate();
      setBusyUserId(null);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err instanceof TRPCClientError ? err.message : 'Failed to update role');
      setBusyUserId(null);
    },
  });

  const setActiveMutation = trpc.users.setActive.useMutation({
    onSuccess: () => {
      void utils.users.list.invalidate();
      void utils.users.getStats.invalidate();
      setBusyUserId(null);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err instanceof TRPCClientError ? err.message : 'Failed to update status');
      setBusyUserId(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    // Debounce: update query param 400ms after last keystroke
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => setDebouncedSearch(value),
      400,
    );
  }

  function handleUpdateRole(id: string, role: UserRole) {
    setBusyUserId(id);
    setActionError(null);
    updateRoleMutation.mutate({ id, role });
  }

  function handleToggleActive(id: string, isActive: boolean) {
    setBusyUserId(id);
    setActionError(null);
    setActiveMutation.mutate({ id, isActive });
  }

  function handleRoleFilter(role: RoleFilter) {
    setRoleFilter(role);
    setPage(1);
  }

  function handleStatusFilter(status: StatusFilter) {
    setStatusFilter(status);
    setPage(1);
  }

  // ── Derived values ─────────────────────────────────────────────────

  const stats = statsQuery.data;
  const data = listQuery.data;
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const totalPages = data?.totalPages ?? 1;
  const isBusy = updateRoleMutation.isPending || setActiveMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        title="User Management"
        subtitle="Manage platform users, roles, and account status"
        breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
      >
        <button
          onClick={() => {
            void utils.users.list.invalidate();
            void utils.users.getStats.invalidate();
          }}
          className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-medium text-[#64748b] shadow-sm transition hover:bg-[#f8fafc]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </PageHeader>

      <div className="px-8 pb-12">
        {/* ── Stats row ─── */}
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
          <StatCard
            label="Total Users"
            value={statsQuery.isLoading ? '…' : (stats?.total ?? 0)}
            icon={<Users className="h-5 w-5 text-[#1e40af]" />}
            accent="bg-[#eff6ff]"
          />
          <StatCard
            label="Active"
            value={statsQuery.isLoading ? '…' : (stats?.active ?? 0)}
            icon={<UserCheck className="h-5 w-5 text-[#15803d]" />}
            accent="bg-[#f0fdf4]"
          />
          <StatCard
            label="Citizens"
            value={statsQuery.isLoading ? '…' : (stats?.byRole.citizen ?? 0)}
            icon={<UserPlus className="h-5 w-5 text-[#0891b2]" />}
            accent="bg-[#ecfeff]"
          />
          <StatCard
            label="MLAs"
            value={statsQuery.isLoading ? '…' : (stats?.byRole.mla ?? 0)}
            icon={<Shield className="h-5 w-5 text-[#7c3aed]" />}
            accent="bg-[#f5f3ff]"
          />
          <StatCard
            label="Admins"
            value={statsQuery.isLoading ? '…' : (stats?.byRole.admin ?? 0)}
            icon={<Shield className="h-5 w-5 text-[#dc2626]" />}
            accent="bg-[#fef2f2]"
          />
        </div>

        {/* ── Filters bar ─── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1" style={{ minWidth: '220px', maxWidth: '340px' }}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 pl-9 pr-9 text-sm text-[#0f172a] placeholder-[#94a3b8] shadow-sm focus:border-[#1e40af] focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-sm">
            <Filter className="ml-2 h-3.5 w-3.5 text-[#94a3b8]" />
            {(['all', 'citizen', 'mla', 'admin'] as RoleFilter[]).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleFilter(role)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  roleFilter === role
                    ? 'bg-[#1e40af] text-white'
                    : 'text-[#64748b] hover:bg-[#f8fafc]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-sm">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-[#1e40af] text-white'
                    : 'text-[#64748b] hover:bg-[#f8fafc]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* ── Action error banner ─── */}
        {actionError && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
            <p className="text-sm text-[#dc2626]">{actionError}</p>
            <button onClick={() => setActionError(null)}>
              <X className="h-4 w-4 text-[#dc2626]" />
            </button>
          </div>
        )}

        {/* ── Table ─── */}
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] gap-4 border-b border-[#f1f5f9] bg-[#f8fafc] px-6 py-3">
            {['Name', 'Phone', 'Role', 'Status', 'Joined', ''].map((h) => (
              <span
                key={h}
                className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col gap-3 px-6 py-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-[#f1f5f9]" />
              ))}
            </div>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fef2f2]">
                <X className="h-6 w-6 text-[#dc2626]" />
              </div>
              <p className="text-sm font-medium text-[#0f172a]">Failed to load users</p>
              <p className="text-xs text-[#94a3b8]">{listQuery.error?.message}</p>
              <button
                onClick={() => void listQuery.refetch()}
                className="mt-1 rounded-xl bg-[#1e40af] px-4 py-2 text-sm font-medium text-white"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && data?.users.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff]">
                <Users className="h-6 w-6 text-[#1e40af]" />
              </div>
              <p className="text-sm font-medium text-[#0f172a]">No users found</p>
              <p className="text-xs text-[#94a3b8]">
                {search || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No users have registered yet'}
              </p>
            </div>
          )}

          {/* Rows */}
          {!isLoading &&
            !isError &&
            data?.users.map((user) => (
              <div
                key={user.id}
                className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] items-center gap-4 border-b border-[#f8fafc] px-6 py-4 transition-colors last:border-0 hover:bg-[#f8fafc] ${
                  busyUserId === user.id ? 'opacity-60' : ''
                }`}
              >
                {/* Name */}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-[#0f172a]">
                    {user.name ?? <span className="italic text-[#94a3b8]">—</span>}
                  </span>
                  <span className="mt-0.5 truncate text-xs text-[#94a3b8]">
                    {user.id.slice(0, 8)}…
                  </span>
                </div>

                {/* Phone */}
                <span className="text-sm text-[#64748b]">{formatPhone(user.phoneNumber)}</span>

                {/* Role */}
                <RoleBadge role={user.role} />

                {/* Status */}
                <StatusBadge isActive={user.isActive} />

                {/* Joined */}
                <span className="text-xs text-[#94a3b8]">{formatDate(user.createdAt)}</span>

                {/* Actions */}
                <div className="flex justify-end">
                  <ActionMenu
                    user={user}
                    onUpdateRole={handleUpdateRole}
                    onToggleActive={handleToggleActive}
                    busy={isBusy && busyUserId === user.id}
                  />
                </div>
              </div>
            ))}
        </div>

        {/* ── Pagination ─── */}
        {!isLoading && !isError && data && data.total > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-[#94a3b8]">
              Showing{' '}
              <span className="font-medium text-[#0f172a]">
                {(page - 1) * 15 + 1}–{Math.min(page * 15, data.total)}
              </span>{' '}
              of <span className="font-medium text-[#0f172a]">{data.total}</span> users
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-[#1e40af] text-white'
                        : 'border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
