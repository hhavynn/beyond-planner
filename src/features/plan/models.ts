export type TimelineEntryKind = "set" | "custom";

export type TimelineEntry = {
  id: string;
  kind: TimelineEntryKind;
  title: string;
  typeLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  timeLabel: string;
  locationLabel: string | null;
  notes: string | null;
  setId: string | null;
  createdAt: string;
  updatedAt: string;
  hasReminder: boolean;
  reminderEnabled: boolean;
  reminderMinutesBefore: number | null;
  reminderLabel: string;
  isReminderScheduled: boolean;
  reminderStatusLabel: string;
  canEdit: boolean;
  canDelete: boolean;
};
