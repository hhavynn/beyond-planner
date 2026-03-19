import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { REMINDER_OFFSET_PRESETS } from "@/constants/reminders";
import { formatReminderOffsetLabel } from "@/lib/time";

type Props = {
  enabled: boolean;
  minutesBefore: number;
  disabled?: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onMinutesBeforeChange: (minutesBefore: number) => void;
};

export function ReminderControls({
  enabled,
  minutesBefore,
  disabled = false,
  onEnabledChange,
  onMinutesBeforeChange,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <Text style={styles.label}>Reminder</Text>
        <Switch value={enabled} onValueChange={onEnabledChange} disabled={disabled} />
      </View>
      <View style={styles.presetRow}>
        {REMINDER_OFFSET_PRESETS.map((preset) => {
          const isSelected = preset === minutesBefore;

          return (
            <Pressable
              key={preset}
              disabled={disabled || !enabled}
              onPress={() => onMinutesBeforeChange(preset)}
              style={[
                styles.presetButton,
                isSelected ? styles.presetButtonSelected : null,
                disabled || !enabled ? styles.presetButtonDisabled : null,
              ]}
            >
              <Text style={[styles.presetText, isSelected ? styles.presetTextSelected : null]}>
                {formatReminderOffsetLabel(preset)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#2d2a26",
    fontSize: 14,
    fontWeight: "600",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: "#d4c8b2",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  presetButtonSelected: {
    backgroundColor: "#1d5c4d",
    borderColor: "#1d5c4d",
  },
  presetButtonDisabled: {
    opacity: 0.5,
  },
  presetText: {
    color: "#2d2a26",
    fontSize: 12,
  },
  presetTextSelected: {
    color: "#ffffff",
  },
});
