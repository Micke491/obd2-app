/**
 * Android surfaces Bluetooth failures as raw Java exceptions — most commonly
 * "java.io.IOException: read failed, socket might closed or timeout, read
 * ret: -1" — and those strings were reaching the screen verbatim. Each entry
 * pairs a phrase the OS actually emits with what a driver can do about it.
 */
const SOCKET_FAILURE_HINTS: Array<[RegExp, string]> = [
  [
    /socket might closed|read failed|socket closed|connection is not created/i,
    'The adapter refused the Bluetooth link. It may be unpowered, out of range, or held by another app — check it is plugged in and no other OBD app is running, then try again.',
  ],
  [
    /already connected|connection already exists/i,
    'Another connection to the adapter is still open. Wait a few seconds and try again.',
  ],
  [
    /connection reset|broken pipe|software caused connection abort/i,
    'The Bluetooth link dropped while talking to the adapter. Move the phone closer and try again.',
  ],
];

/** Strips `java.io.IOException:`-style prefixes off anything unrecognised. */
const JAVA_CLASS_PREFIX = /(?:[a-z][\w$.]*\.)+\w*(?:Exception|Error):?\s*/g;

export function humanizeBluetoothError(message: string): string {
  for (const [pattern, plain] of SOCKET_FAILURE_HINTS) {
    if (pattern.test(message)) return plain;
  }

  const stripped = message.replace(JAVA_CLASS_PREFIX, '').trim();
  return stripped || message;
}
