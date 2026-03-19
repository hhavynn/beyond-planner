import { StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  value: string;
};

export function KeyValueRow({ label, value }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    flex: 1,
    color: "#6c655a",
    fontSize: 14,
  },
  value: {
    flex: 1,
    textAlign: "right",
    color: "#2d2a26",
    fontSize: 14,
    fontWeight: "600",
  },
});
