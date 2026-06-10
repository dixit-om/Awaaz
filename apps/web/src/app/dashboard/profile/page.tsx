'use client';

import { Edit3, LogOut, Shield, FileText, CheckCircle2, Star } from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NotificationPreferencesForm } from '@/components/notifications/notification-preferences-form';
import { useAuth } from '@/contexts/auth-context';

export default function ProfilePage() {
  const { logout } = useAuth();
  return (
    <div>
      <PageHeader
        title="My Profile"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]}
      />

      <div className="grid max-w-5xl gap-6 px-8 pb-8 lg:grid-cols-[280px,1fr]">
        {/* Left — Identity */}
        <div className="space-y-4">
          <Card className="text-center">
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative">
                <Avatar name="Aarav Sharma" size="xl" />
                <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#1e40af] shadow-md">
                  <Edit3 className="h-3 w-3 text-white" />
                </button>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0f172a]">Aarav Sharma</h2>
                <p className="text-sm text-[#64748b]">+91 98765 43212</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="info">Citizen</Badge>
                <Badge variant="success">Verified</Badge>
              </div>
              <p className="text-xs text-[#94a3b8]">Member since January 2025</p>
            </div>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Stats</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {[
                {
                  label: 'Total Filed',
                  value: 15,
                  icon: FileText,
                  color: 'text-[#1e40af]',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Resolved',
                  value: 12,
                  icon: CheckCircle2,
                  color: 'text-green-600',
                  bg: 'bg-green-50',
                },
                {
                  label: 'Impact Points',
                  value: '2,400',
                  icon: Star,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg ${s.bg} flex flex-shrink-0 items-center justify-center`}
                  >
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[#64748b]">{s.label}</p>
                  </div>
                  <p className="text-sm font-bold text-[#0f172a]">{s.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right — Settings */}
        <div className="space-y-4">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <Button variant="outline" size="sm">
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </Button>
            </CardHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Full Name', value: 'Aarav Sharma' },
                { label: 'Mobile Number', value: '+91 98765 43212' },
                { label: 'Ward', value: 'Ward 7, Gurgaon' },
                { label: 'Constituency', value: 'Gurgaon Central' },
                { label: 'Registered Address', value: 'Sector 14, Gurgaon, Haryana' },
                { label: 'Member Since', value: 'January 2025' },
              ].map((row) => (
                <div key={row.label}>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                    {row.label}
                  </p>
                  <p className="text-sm text-[#0f172a]">{row.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <NotificationPreferencesForm />

          {/* Account Security */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-3">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">OTP Verified Account</span>
                <Badge variant="verified" className="ml-auto">
                  Secure
                </Badge>
              </div>
              <Button variant="danger" size="sm" className="mt-3 w-full" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
