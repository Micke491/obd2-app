import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Android split the Bluetooth permissions at API 31: below it scanning is gated
 * behind location access, at and above it there are dedicated `BLUETOOTH_*`
 * permissions. Requesting the wrong set for the OS version is denied silently
 * and surfaces later as an empty device list.
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  const permissions =
    apiLevel >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  try {
    const result = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
  } catch {
    return false;
  }
}
