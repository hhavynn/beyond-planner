import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { formatClockLabel, formatDateLabel, mergeDatePart, mergeTimePart } from "@/lib/time";

type Props = {
  label: string;
  value: Date | null;
  onChange: (next: Date) => void;
};

export function DateTimeField({ label, value, onChange }: Props) {
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setPickerMode(null);
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    if (pickerMode === "date") {
      onChange(mergeDatePart(value, selectedDate));
      return;
    }

    onChange(mergeTimePart(value, selectedDate));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.fieldButton} onPress={() => setPickerMode("date")}>
          <Text style={styles.fieldButtonText}>{formatDateLabel(value)}</Text>
        </Pressable>
        <Pressable style={styles.fieldButton} onPress={() => setPickerMode("time")}>
          <Text style={styles.fieldButtonText}>{formatClockLabel(value)}</Text>
        </Pressable>
      </View>
      {pickerMode ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode={pickerMode}
          onChange={handleChange}
          display="default"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: "#2d2a26",
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  fieldButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d4c8b2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  fieldButtonText: {
    color: "#2d2a26",
    fontSize: 14,
  },
});
