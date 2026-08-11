import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles, type Theme } from '@/theme';

import { AppText } from './text';

type SheetProps = {
  visible: boolean;
  title: string;
  /** Sits under the title, for what the choice below actually costs. */
  subtitle?: string;
  children: ReactNode;
  /**
   * Whether the driver may leave without answering.
   *
   * False is not decoration: it is how a sheet over work in progress stops
   * being dismissed by a reflex — the backdrop stops accepting taps and the
   * Android back button stops closing it, so the only way out is the button
   * that actually ends the work. `onDismiss` is then never called.
   */
  dismissible?: boolean;
  onDismiss: () => void;
};

/**
 * A panel over the current screen, for a question that belongs to it.
 *
 * Deliberately not a navigation destination. The scan flow asks three
 * questions in a row — what to scan, are you sure, and may I stop — and
 * routing each one would take the driver away from the results they are
 * waiting on, then have to find its way back afterwards.
 */
export function Sheet({
  visible,
  title,
  subtitle,
  children,
  dismissible = true,
  onDismiss,
}: SheetProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const dismiss = () => {
    if (dismissible) onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android's hardware back. Without this the system closes the modal
      // itself, which for the progress phase would abandon a running scan
      // while leaving it running.
      onRequestClose={dismiss}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.scrim}
          onPress={dismiss}
          // A scrim that cannot dismiss should not answer to a screen reader
          // as though it could.
          accessibilityRole={dismissible ? 'button' : undefined}
          accessibilityLabel={dismissible ? `Close ${title}` : undefined}
          importantForAccessibility={dismissible ? 'yes' : 'no-hide-descendants'}
        />
        <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <AppText variant="subheading">{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" tone="muted" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: t.color.scrim },
    panel: {
      backgroundColor: t.color.ground,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      paddingHorizontal: t.space.lg,
      paddingTop: t.space.md,
      borderTopWidth: t.size.hairline,
      borderTopColor: t.color.rule,
      ...t.shadow.raised,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: t.radius.pill,
      backgroundColor: t.color.ruleStrong,
      marginBottom: t.space.lg,
    },
    subtitle: { marginTop: t.space.xs },
    content: { marginTop: t.space.lg, gap: t.space.sm },
  });
