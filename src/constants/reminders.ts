export const REMINDER_OFFSET_PRESETS = [0, 5, 15, 30, 60] as const;

export type ReminderOffsetPreset = (typeof REMINDER_OFFSET_PRESETS)[number];
