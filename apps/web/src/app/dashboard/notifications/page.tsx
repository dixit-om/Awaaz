import { CheckCircle2, MapPin, Bell, Users, AlertTriangle, Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NOTIFICATIONS = {
  Today: [
    {
      id: 1,
      type: 'resolved',
      icon: CheckCircle2,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      text: 'Your complaint #AWZ-04815 has been marked Resolved.',
      sub: 'Please verify if the issue is fixed.',
      time: '10 mins ago',
      unread: true,
      actionLabel: 'Verify Now',
      href: '/dashboard/complaints/AWZ-04815',
    },
    {
      id: 2,
      type: 'assigned',
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-[#1e40af]',
      text: 'Complaint #AWZ-04819 assigned to Water Board.',
      sub: 'Expected resolution within 3–5 working days.',
      time: '3 hours ago',
      unread: true,
      actionLabel: 'Track',
      href: '/dashboard/complaints/AWZ-04819',
    },
    {
      id: 3,
      type: 'info',
      icon: Info,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      text: 'Ward 7 meeting scheduled for June 8th at the Community Hall.',
      sub: 'Attend to raise civic concerns directly.',
      time: '5 hours ago',
      unread: false,
      actionLabel: null,
      href: null,
    },
  ],
  Yesterday: [
    {
      id: 4,
      type: 'location',
      icon: MapPin,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      text: 'New complaint filed near your area: Garbage not collected.',
      sub: '0.4 km from your registered address.',
      time: 'Yesterday, 6:30 PM',
      unread: false,
      actionLabel: 'View',
      href: '/transparency',
    },
    {
      id: 5,
      type: 'alert',
      icon: AlertTriangle,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      text: 'SLA Breach: Complaint #AWZ-04821 pending for 7 days.',
      sub: 'Escalation may be triggered if unresolved.',
      time: 'Yesterday, 2:15 PM',
      unread: false,
      actionLabel: 'Track',
      href: '/dashboard/complaints/AWZ-04821',
    },
  ],
  'Earlier this week': [
    {
      id: 6,
      type: 'info',
      icon: Bell,
      iconBg: 'bg-slate-50',
      iconColor: 'text-[#64748b]',
      text: 'Weekly digest: 12 issues resolved in Ward 7 this week!',
      sub: 'Governance score improved by 4 points.',
      time: 'Jun 1, 2026',
      unread: false,
      actionLabel: null,
      href: null,
    },
  ],
};

export default function NotificationsPage() {
  const totalUnread = Object.values(NOTIFICATIONS)
    .flat()
    .filter((n) => n.unread).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${totalUnread} unread notifications`}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]}
      >
        <Button variant="outline" size="sm">
          Mark all as read
        </Button>
      </PageHeader>

      <div className="max-w-3xl space-y-6 px-8 pb-8">
        {Object.entries(NOTIFICATIONS).map(([group, items]) => (
          <div key={group}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
              {group}
            </p>
            <div className="space-y-2">
              {items.map((n) => (
                <Card
                  key={n.id}
                  padding="sm"
                  className={cn(
                    'transition-colors',
                    n.unread && 'border-l-[3px] border-l-[#1e40af]',
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl ${n.iconBg} flex flex-shrink-0 items-center justify-center`}
                    >
                      <n.icon className={`h-4 w-4 ${n.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm leading-snug',
                            n.unread ? 'font-semibold text-[#0f172a]' : 'text-[#0f172a]',
                          )}
                        >
                          {n.text}
                        </p>
                        <span className="whitespace-nowrap text-[10px] text-[#94a3b8]">
                          {n.time}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#64748b]">{n.sub}</p>
                      {n.actionLabel && n.href && (
                        <a href={n.href}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 px-2 text-xs text-[#1e40af]"
                          >
                            {n.actionLabel} →
                          </Button>
                        </a>
                      )}
                    </div>
                    {n.unread && (
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#1e40af]" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
