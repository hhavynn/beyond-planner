export function nowIsoString() {
  return new Date().toISOString();
}

const LOCAL_DATE_TIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T])(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function toTimestampMs(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const parsed = new Date(input);
  const timestamp = parsed.getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

export function compareDateTimes(a: string | null | undefined, b: string | null | undefined) {
  const left = toTimestampMs(a);
  const right = toTimestampMs(b);

  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

export function parseDateTimeInput(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const localMatch = trimmed.match(LOCAL_DATE_TIME_REGEX);

  if (localMatch) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText] = localMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = secondText ? Number(secondText) : 0;

    const date = new Date(year, month - 1, day, hour, minute, second, 0);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute
    ) {
      return null;
    }

    return date.toISOString();
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function dateToIsoString(date: Date | null) {
  if (!date) {
    return null;
  }

  return date.toISOString();
}

export function isoStringToDate(input: string | null) {
  const timestamp = toTimestampMs(input);
  return timestamp === null ? null : new Date(timestamp);
}

export function formatDateTimeInputValue(input: string | null) {
  const timestamp = toTimestampMs(input);

  if (timestamp === null) {
    return "";
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function mergeDatePart(base: Date | null, datePart: Date) {
  const draft = base ? new Date(base.getTime()) : new Date();
  draft.setFullYear(datePart.getFullYear(), datePart.getMonth(), datePart.getDate());
  return draft;
}

export function mergeTimePart(base: Date | null, timePart: Date) {
  const draft = base ? new Date(base.getTime()) : new Date();
  draft.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return draft;
}

export function isValidDateRange(startAt: string | null, endAt: string | null) {
  const startTimestamp = toTimestampMs(startAt);
  const endTimestamp = toTimestampMs(endAt);

  if (startTimestamp === null || endTimestamp === null) {
    return false;
  }

  return startTimestamp < endTimestamp;
}

export function rangesOverlap(
  startA: string | null,
  endA: string | null,
  startB: string | null,
  endB: string | null,
) {
  const startATimestamp = toTimestampMs(startA);
  const endATimestamp = toTimestampMs(endA);
  const startBTimestamp = toTimestampMs(startB);
  const endBTimestamp = toTimestampMs(endB);

  if (
    startATimestamp === null ||
    endATimestamp === null ||
    startBTimestamp === null ||
    endBTimestamp === null
  ) {
    return false;
  }

  return startATimestamp < endBTimestamp && startBTimestamp < endATimestamp;
}

export function formatTimestamp(input: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!input) {
    return "Not available";
  }

  const timestamp = toTimestampMs(input);

  if (timestamp === null) {
    return "Invalid date";
  }

  return new Date(timestamp).toLocaleString(undefined, options);
}

export function formatDateLabel(input: Date | string | null) {
  const date = typeof input === "string" ? isoStringToDate(input) : input;

  if (!date) {
    return "Select date";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatClockLabel(input: Date | string | null) {
  const date = typeof input === "string" ? isoStringToDate(input) : input;

  if (!date) {
    return "Select time";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeRange(startAt: string | null, endAt: string | null) {
  const startTimestamp = toTimestampMs(startAt);
  const endTimestamp = toTimestampMs(endAt);

  if (startTimestamp === null || endTimestamp === null) {
    return "Time TBD";
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const endFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startTimestamp))} - ${endFormatter.format(
    new Date(endTimestamp),
  )}`;
}

export function getReminderTriggerTime(startsAt: string | null, minutesBefore: number) {
  const startTimestamp = toTimestampMs(startsAt);

  if (startTimestamp === null) {
    return null;
  }

  return new Date(startTimestamp - minutesBefore * 60_000).toISOString();
}

export function isFutureDateTime(input: string | null) {
  const timestamp = toTimestampMs(input);

  if (timestamp === null) {
    return false;
  }

  return timestamp > Date.now();
}

export function formatReminderOffsetLabel(minutesBefore: number) {
  if (minutesBefore === 0) {
    return "At time of event";
  }

  if (minutesBefore === 60) {
    return "1 hour before";
  }

  return `${minutesBefore} min before`;
}
