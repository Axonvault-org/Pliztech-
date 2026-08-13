import { Pressable, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import {
  LEGAL_DOCUMENT_LABELS,
  openLegalDocument,
  type LegalDocumentKind,
} from '@/lib/compliance/legal-urls';

type LegalDocumentLinkProps = {
  kind: LegalDocumentKind;
  /** Override visible label (defaults to document name). */
  label?: string;
  style?: TextStyle;
  containerStyle?: ViewStyle;
};

export function LegalDocumentLink({ kind, label, style, containerStyle }: LegalDocumentLinkProps) {
  const displayLabel = label ?? LEGAL_DOCUMENT_LABELS[kind];

  return (
    <Pressable
      onPress={() => void openLegalDocument(kind)}
      accessibilityRole="link"
      accessibilityLabel={`Open ${displayLabel}`}
      style={containerStyle}
    >
      <Text style={[styles.link, style]}>{displayLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    color: '#2E8BEA',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
