'use client';

import { Bell, Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/trpc/client';
import { cn } from '@/lib/utils';

type PreferenceKey = 'inAppEnabled' | 'pushEnabled' | 'emailEnabled';

const PREFERENCE_ROWS: {
  key: PreferenceKey;
  label: string;
  sub: string;
  icon: typeof Bell;
}[] = [
  {
    key: 'inAppEnabled',
    label: 'In-App Notifications',
    sub: 'Complaint updates and alerts inside AWAAZ',
    icon: Bell,
  },
  {
    key: 'pushEnabled',
    label: 'Push Notifications',
    sub: 'Mobile and browser push alerts',
    icon: Smartphone,
  },
  {
    key: 'emailEnabled',
    label: 'Email Notifications',
    sub: 'Important updates sent to your email',
    icon: Mail,
  },
];

function PreferenceToggle({
  enabled,
  disabled,
  onToggle,
}: {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative h-[22px] w-10 rounded-full transition-colors disabled:opacity-50',
        enabled ? 'bg-[#1e40af]' : 'bg-[#e2e8f0]',
      )}
      aria-pressed={enabled}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export function NotificationPreferencesForm() {
  const prefsQuery = trpc.notifications.getPreferences.useQuery();
  const utils = trpc.useUtils();

  const updatePrefs = trpc.notifications.updatePreferences.useMutation({
    onMutate: async (input) => {
      await utils.notifications.getPreferences.cancel();
      const previous = utils.notifications.getPreferences.getData();
      utils.notifications.getPreferences.setData(undefined, (old) =>
        old ? { ...old, ...input, updatedAt: new Date() } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        utils.notifications.getPreferences.setData(undefined, ctx.previous);
      }
    },
    onSettled: () => {
      void utils.notifications.getPreferences.invalidate();
    },
  });

  const prefs = prefsQuery.data;

  function handleToggle(key: PreferenceKey) {
    if (!prefs) return;
    updatePrefs.mutate({ [key]: !prefs[key] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        {updatePrefs.isSuccess && <span className="text-xs font-medium text-green-600">Saved</span>}
      </CardHeader>

      {prefsQuery.isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-[#f1f5f9]" />
          ))}
        </div>
      )}

      {prefsQuery.isError && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-4 text-sm text-red-700">
          <p>Could not load notification preferences.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void prefsQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {prefs && (
        <div className="space-y-4">
          {PREFERENCE_ROWS.map((pref) => (
            <div key={pref.key} className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9]">
                <pref.icon className="h-4 w-4 text-[#64748b]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#0f172a]">{pref.label}</p>
                <p className="text-xs text-[#94a3b8]">{pref.sub}</p>
              </div>
              <PreferenceToggle
                enabled={prefs[pref.key]}
                disabled={updatePrefs.isPending}
                onToggle={() => handleToggle(pref.key)}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
