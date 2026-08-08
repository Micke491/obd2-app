/**
 * The sets of readings that are worth watching together.
 *
 * Each group is deliberately short. The adapter is half-duplex, so every extra
 * PID in a cycle slows down all of them — three or four is what keeps a trace
 * smooth enough to read a transient off. These are also groups in the
 * diagnostic sense, not the taxonomic one: throttle belongs beside engine speed
 * because the question is whether the engine did what the pedal asked, even
 * though PID_GROUPS files it under "load".
 */
import { getPidDefinition } from '@/lib/obd/pids';

export type TraceGroup = {
  id: string;
  label: string;
  /** One sentence saying what the shape of these lines together tells you. */
  hint: string;
  pids: string[];
};

export const TRACE_GROUPS: TraceGroup[] = [
  {
    id: 'engine',
    label: 'Engine',
    hint: 'Whether the engine did what the pedal asked. Load and revs should follow the throttle without lagging or hunting.',
    pids: ['0C', '04', '11'], // Engine speed, calculated load, throttle position
  },
  {
    id: 'fuel',
    label: 'Fuel',
    hint: 'How hard the engine computer is having to correct the mixture, and whether the oxygen sensor is still swinging briskly across its range.',
    pids: ['06', '07', '14', '15'], // STFT and LTFT bank 1, O2 sensors 1 and 2
  },
  {
    id: 'temperature',
    label: 'Temperature',
    hint: 'Warm-up and cooling behaviour. Coolant should climb steadily, then hold flat once the thermostat opens.',
    pids: ['05', '0F', '3C'], // Coolant, intake air, catalyst bank 1
  },
  {
    id: 'charging',
    label: 'Charging',
    hint: 'What the alternator is doing as revs change. The voltage should sit steady in the mid-fourteens rather than sagging with load.',
    pids: ['42', '0C', '04'], // Module voltage, engine speed, load
  },
];

/**
 * The groups this car can actually fill, with unsupported readings removed.
 *
 * An empty supportedPids list means discovery never ran, in which case
 * everything is offered and a PID the car does not answer simply stays flat —
 * the same convention the Live data and Dashboard screens use.
 */
export function availableGroups(supportedPids: string[]): TraceGroup[] {
  return TRACE_GROUPS.map((group) => ({
    ...group,
    pids: group.pids.filter(
      (pid) =>
        getPidDefinition(pid) !== undefined &&
        (supportedPids.length === 0 || supportedPids.includes(pid)),
    ),
  })).filter((group) => group.pids.length > 0);
}
