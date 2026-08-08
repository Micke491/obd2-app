/**
 * The buses an OBD-II car can speak, and the order worth trying them in.
 *
 * An ELM327 can find the protocol on its own — `ATSP0` arms that search — but
 * auto-detection is the weakest part of the chip and weaker still on the clones
 * most people own. It gives up on cars a workshop tool reaches without trouble,
 * and it gives up in a way that looks identical to an unplugged adapter. Naming
 * each protocol in turn is the fallback every serious scan tool has, and it is
 * what turns "this app cannot see my car" into a connection.
 */

export type ObdProtocol = {
  /** The digit `ATSP` takes. */
  id: string;
  name: string;
  /**
   * Longest one `0100` on this protocol can reasonably take. The K-line
   * protocols carry out a slow initialisation handshake before any data moves —
   * five-baud address transmission alone takes two seconds — so they need far
   * more room than a CAN bus that either answers immediately or not at all.
   */
  probeTimeoutMs: number;
};

export const PROTOCOL_NAMES: Record<string, string> = {
  '1': 'SAE J1850 PWM',
  '2': 'SAE J1850 VPW',
  '3': 'ISO 9141-2',
  '4': 'ISO 14230-4 KWP, 5-baud init',
  '5': 'ISO 14230-4 KWP, fast init',
  '6': 'CAN 11-bit, 500 kbps',
  '7': 'CAN 29-bit, 500 kbps',
  '8': 'CAN 11-bit, 250 kbps',
  '9': 'CAN 29-bit, 250 kbps',
  A: 'SAE J1939 CAN',
  B: 'User CAN 11-bit',
  C: 'User CAN 29-bit',
};

/**
 * Tried in this order when auto-detection has already failed.
 *
 * Cheap first: every CAN variant answers or stays silent within a moment, so
 * ruling all four out costs a couple of seconds. The K-line protocols follow,
 * because each one spends real time on its initialisation handshake whether or
 * not the car is listening. J1850 is last — it is North-American and pre-2004,
 * so it is the least likely and there is nothing after it to delay.
 *
 * The two user-defined CAN slots are left out: they describe whatever baud rate
 * was last programmed into the adapter, not a bus any car is fitted with.
 * J1939 is left out too, being a truck protocol that no OBD-II car answers.
 */
export const PROTOCOL_SWEEP: ObdProtocol[] = [
  { id: '6', name: PROTOCOL_NAMES['6'], probeTimeoutMs: 4000 },
  { id: '7', name: PROTOCOL_NAMES['7'], probeTimeoutMs: 4000 },
  { id: '8', name: PROTOCOL_NAMES['8'], probeTimeoutMs: 4000 },
  { id: '9', name: PROTOCOL_NAMES['9'], probeTimeoutMs: 4000 },
  { id: '5', name: PROTOCOL_NAMES['5'], probeTimeoutMs: 7000 },
  { id: '4', name: PROTOCOL_NAMES['4'], probeTimeoutMs: 10000 },
  { id: '3', name: PROTOCOL_NAMES['3'], probeTimeoutMs: 10000 },
  { id: '1', name: PROTOCOL_NAMES['1'], probeTimeoutMs: 6000 },
  { id: '2', name: PROTOCOL_NAMES['2'], probeTimeoutMs: 6000 },
];

/**
 * Reads the protocol out of an `ATDPN` reply.
 *
 * The adapter answers with the protocol number, prefixed with `A` when it was
 * auto-detection rather than the app that chose it. `A0` means the search has
 * not settled on anything yet, which is not a protocol.
 */
export function protocolIdFromReply(reply: string): string | null {
  const compact = reply.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const match = compact.match(/^A?([1-9A-C])$/);
  return match ? match[1] : null;
}

/** The same reply as something worth showing a driver. */
export function describeProtocolReply(reply: string): string | null {
  const id = protocolIdFromReply(reply);
  return id ? (PROTOCOL_NAMES[id] ?? null) : null;
}
