import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { AUTHORED_CODES, CATALOG_CODES, DTC_CATALOG, isValidCode, normaliseCode } from '@/lib/obd/dtc';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const MAX_SUGGESTIONS = 25;

/**
 * Any code, with or without a car attached.
 *
 * Resolution is pure local data, so this works with the adapter unplugged —
 * which is exactly when somebody has a code written on a garage invoice and
 * wants to know what they are being charged for.
 */
export function CodeLookupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');

  const typed = normaliseCode(query);
  const exact = isValidCode(typed);

  const suggestions = useMemo(() => {
    if (typed.length < 2) return AUTHORED_CODES.slice(0, MAX_SUGGESTIONS);
    const needle = typed.toLowerCase();
    const pool = new Set([...AUTHORED_CODES, ...CATALOG_CODES]);
    return [...pool]
      .filter((code) => code.toLowerCase().startsWith(needle))
      .sort()
      .slice(0, MAX_SUGGESTIONS);
  }, [typed]);

  return (
    <Screen edges={{ top: false }}>
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.color.inkFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="P0301"
          placeholderTextColor={theme.color.inkFaint}
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          returnKeyType="search"
          onSubmitEditing={() => exact && router.push(`/code/${typed}`)}
          accessibilityLabel="Trouble code"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear">
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.color.inkFaint} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {exact ? (
          <Card onPress={() => router.push(`/code/${typed}`)} spine={theme.color.accent}>
            <AppText variant="eyebrow" tone="accent">
              Open this code
            </AppText>
            <AppText variant="heading" style={styles.exact}>
              {typed}
            </AppText>
            {/* The brief rather than the SAE title, which is the question. */}
            <AppText variant="caption" tone="muted">
              {DTC_CATALOG[typed]?.brief ?? 'Not in the standard list — you will still get an explanation.'}
            </AppText>
          </Card>
        ) : null}

        {typed.length >= 2 && suggestions.length === 0 && !exact ? (
          <EmptyState
            icon="magnify-close"
            title="Nothing starts with that"
            body="Codes are a letter then four characters, like P0420 or U0100. Type a full code and it will open even if it is not in the list."
          />
        ) : null}

        {suggestions.length ? (
          <View style={styles.list}>
            <AppText variant="eyebrow" tone="faint">
              {typed.length < 2 ? 'Common codes' : 'Matches'}
            </AppText>
            {suggestions.map((code) => (
              <Pressable
                key={code}
                onPress={() => router.push(`/code/${code}`)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <AppText variant="mono" style={styles.rowCode}>
                  {code}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.rowText}>
                  {DTC_CATALOG[code]?.title ?? 'Explanation available'}
                </AppText>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.color.inkFaint} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.sm,
      paddingHorizontal: t.space.md,
      height: 48,
      marginTop: t.space.lg,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
    },
    input: {
      flex: 1,
      fontFamily: t.font.mono,
      fontSize: 17,
      letterSpacing: 1,
      color: t.color.ink,
      padding: 0,
    },
    body: { gap: t.space.xl, paddingTop: t.space.lg, paddingBottom: t.space.xxxl },
    exact: { marginTop: t.space.xs, marginBottom: 2 },
    list: { gap: t.space.xs },
    row: {
      minHeight: t.size.touch,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.md,
      paddingVertical: t.space.sm,
      borderBottomWidth: t.size.hairline,
      borderBottomColor: t.color.rule,
    },
    rowPressed: { backgroundColor: t.color.surfaceSunken },
    rowCode: { width: 62, fontSize: 15, color: t.color.ink },
    rowText: { flex: 1 },
  });
