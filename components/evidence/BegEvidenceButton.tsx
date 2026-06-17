import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { getBegEvidence, type BegEvidenceItem } from '@/lib/api/evidence';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessTokenOrTryRefresh } from '@/lib/auth/session-expired';

import { BegEvidenceViewerModal } from './BegEvidenceViewerModal';

type BegEvidenceButtonProps = {
  begId: string;
  evidenceCount?: number;
  compact?: boolean;
};

export function BegEvidenceButton({
  begId,
  evidenceCount = 0,
  compact = false,
}: BegEvidenceButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [evidence, setEvidence] = useState<BegEvidenceItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (evidenceCount <= 0) return null;

  const openEvidence = async () => {
    setModalOpen(true);
    setSelectedIndex(0);
    setError(null);
    setLoading(true);
    try {
      const token = await getAccessTokenOrTryRefresh();
      if (!token) {
        setEvidence([]);
        setError('Sign in to view evidence for this request.');
        return;
      }
      const items = await getBegEvidence(token, begId);
      setEvidence(items);
      if (items.length === 0) {
        setError('No evidence is available for this request.');
      }
    } catch (e) {
      setEvidence([]);
      setError(formatPlizApiErrorForUser(e) || 'Could not load evidence.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          compact && styles.buttonCompact,
          pressed && styles.pressed,
        ]}
        onPress={() => void openEvidence()}
        accessibilityRole="button"
        accessibilityLabel="View request evidence"
      >
        <Ionicons name="document-text-outline" size={15} color="#2E8BEA" />
        <Text style={styles.label}>{compact ? 'Evidence' : 'View evidence'}</Text>
      </Pressable>
      <BegEvidenceViewerModal
        visible={modalOpen}
        evidence={evidence}
        selectedIndex={selectedIndex}
        loading={loading}
        error={error}
        onClose={() => setModalOpen(false)}
        onSelectIndex={setSelectedIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonCompact: {
    minHeight: 32,
    paddingHorizontal: 10,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E8BEA',
  },
});
