import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/Text';

export interface ProfileRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  badge?: string;
  disabled?: boolean;
  isLast?: boolean;
}

export function ProfileRow({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  showToggle = false,
  toggleValue = false,
  onToggleChange,
  badge,
  disabled = false,
  isLast = false,
}: ProfileRowProps) {
  const content = (
    <View style={styles.content}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color="#9CA3AF" />
      </View>
      <View style={styles.textWrap}>
        <View style={styles.titleLine}>
          <Text style={styles.title}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          disabled={disabled}
          trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
          thumbColor="#FFFFFF"
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      ) : null}
    </View>
  );

  const rowStyle = [styles.row, isLast && styles.rowLast];

  if (onPress && !showToggle && !disabled) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#EEF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E8BEA',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
