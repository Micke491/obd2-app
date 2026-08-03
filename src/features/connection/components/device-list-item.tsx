import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BluetoothDevice } from 'react-native-bluetooth-classic';

import { TOUCH_TARGET, colors, fonts, radius, spacing } from '@/theme';

type DeviceListItemProps = {
  device: BluetoothDevice;
  /** Marks adapters whose name matches a known OBD dongle. */
  likelyAdapter: boolean;
  busy: boolean;
  disabled: boolean;
  onPress: (device: BluetoothDevice) => void;
};

export function DeviceListItem({ device, likelyAdapter, busy, disabled, onPress }: DeviceListItemProps) {
  return (
    <Pressable
      onPress={() => onPress(device)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Connect to ${device.name}`}
      style={({ pressed }) => [
        styles.row,
        likelyAdapter && styles.rowHighlighted,
        pressed && styles.rowPressed,
        disabled && !busy && styles.rowDisabled,
      ]}
    >
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {device.name || 'Unnamed device'}
        </Text>
        <Text style={styles.address}>{device.address}</Text>
      </View>

      {busy ? <ActivityIndicator color={colors.amber} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_TARGET + 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  // A left edge in amber, rather than a badge, keeps the scan for "which of
  // these is my adapter" to a single vertical sweep of the list.
  rowHighlighted: {
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
  },
  rowPressed: {
    backgroundColor: colors.panelActive,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.readout,
  },
  address: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.dim,
    letterSpacing: 0.5,
  },
});
