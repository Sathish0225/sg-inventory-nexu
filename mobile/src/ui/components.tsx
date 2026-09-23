import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { radius, space, useColors, type Colors } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

type TextVariant = "title" | "heading" | "body" | "label" | "caption" | "money";

export function Text({
  children,
  variant = "body",
  muted,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[textStyles[variant], { color: color ?? (muted ? c.muted : c.text) }, style]}
    >
      {children}
    </RNText>
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 15 },
  label: { fontSize: 13, fontWeight: "600" },
  caption: { fontSize: 12 },
  money: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
});

/** Scrollable page with pull-to-refresh. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[{ padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={c.primary} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const base = [styles.card, { backgroundColor: c.card, borderColor: c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text variant="label" muted style={{ textTransform: "uppercase", letterSpacing: 0.6, flex: 1 }}>
        {children}
      </Text>
      {action}
    </View>
  );
}

type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  title,
  onPress,
  icon,
  tone = "primary",
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  tone?: ButtonTone;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const palette = buttonPalette(c)[tone];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.8 },
        inactive && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={palette.fg} />}
          <Text variant="label" color={palette.fg} style={{ fontSize: 15 }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const buttonPalette = (c: Colors) => ({
  primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
  secondary: { bg: c.card, fg: c.text, border: c.border },
  danger: { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft },
  ghost: { bg: "transparent", fg: c.primary, border: "transparent" },
});

export function Input({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }, props.style]}
      />
      {hint && (
        <Text variant="caption" muted>
          {hint}
        </Text>
      )}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const c = useColors();
  return (
    <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
      <Ionicons name="search" size={18} color={c.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={{ flex: 1, color: c.text, fontSize: 15, paddingVertical: 10 }}
      />
    </View>
  );
}

const badgeTone = (c: Colors, status: string): { bg: string; fg: string } => {
  const map: Record<string, keyof Colors> = {
    Paid: "success",
    Completed: "success",
    Accepted: "success",
    Fulfilled: "success",
    "In Stock": "success",
    Overdue: "danger",
    Rejected: "danger",
    Expired: "danger",
    "Out of Stock": "danger",
    High: "danger",
    "In Progress": "warning",
    "Partially Paid": "warning",
    "Low Stock": "warning",
    "On site": "warning",
    Medium: "warning",
    Sent: "primary",
    Scheduled: "primary",
    Confirmed: "primary",
    Unpaid: "primary",
    Assigned: "violet",
  };
  const key = map[status];
  if (!key) return { bg: c.border, fg: c.muted };
  return { fg: c[key] as string, bg: c[`${key}Soft` as keyof Colors] as string };
};

export function Badge({ status }: { status: string }) {
  const c = useColors();
  const tone = badgeTone(c, status);
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text variant="caption" color={tone.fg} style={{ fontWeight: "600" }}>
        {status}
      </Text>
    </View>
  );
}

export function Stat({ label, value, hint, icon, tone = "primary" }: { label: string; value: string | number; hint?: string; icon: IconName; tone?: "primary" | "success" | "warning" | "danger" | "violet" }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, minWidth: 150, gap: 6 }}>
      <View style={[styles.statIcon, { backgroundColor: c[`${tone}Soft` as keyof Colors] as string }]}>
        <Ionicons name={icon} size={18} color={c[tone] as string} />
      </View>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="title" style={{ fontSize: 22 }} numberOfLines={1}>
        {value}
      </Text>
      {hint && (
        <Text variant="caption" muted numberOfLines={1}>
          {hint}
        </Text>
      )}
    </Card>
  );
}

/** A row in a list card: title, subtitle, and something on the right. */
export function ListRow({
  title,
  subtitle,
  right,
  onPress,
  icon,
  last,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  icon?: IconName;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.listRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        pressed && { opacity: 0.6 },
      ]}
    >
      {icon && <Ionicons name={icon} size={20} color={c.primary} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontWeight: "500" }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" muted numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={16} color={c.muted} />}
    </Pressable>
  );
}

export function Empty({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", paddingVertical: space.xl * 2, gap: space.sm }}>
      <View style={[styles.statIcon, { width: 52, height: 52, borderRadius: 26, backgroundColor: c.border }]}>
        <Ionicons name={icon} size={24} color={c.muted} />
      </View>
      <Text variant="heading">{title}</Text>
      {hint && (
        <Text muted style={{ textAlign: "center" }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
      <ActivityIndicator color={c.primary} size="large" />
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.border }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: c.card }]}
          >
            <Text variant="label" color={active ? c.text : c.muted}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text muted style={{ flex: 1 }}>
        {label}
      </Text>
      {typeof value === "string" || typeof value === "number" ? <Text style={{ fontWeight: "500" }}>{value}</Text> : value}
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16 },
  search: { flexDirection: "row", alignItems: "center", gap: space.sm, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.md },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  listRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, minHeight: 52 },
  segmented: { flexDirection: "row", borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.sm },
});
