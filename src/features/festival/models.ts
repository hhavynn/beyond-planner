export type ScheduleSetListItem = {
  setId: string;
  title: string;
  dayLabel: string;
  stageLabel: string;
  startsAt: string;
  endsAt: string;
  timeLabel: string;
  isFavorite: boolean;
  isInPlan: boolean;
  planItemId: string | null;
  isPlaceholder: boolean;
};
