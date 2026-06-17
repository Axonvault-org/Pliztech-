import Ionicons from '@expo/vector-icons/Ionicons';
import { createElement } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Text';
import type { BegEvidenceItem } from '@/lib/api/evidence';

type BegEvidenceViewerModalProps = {
  visible: boolean;
  evidence: BegEvidenceItem[];
  selectedIndex?: number;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSelectIndex?: (index: number) => void;
};

function isPdfEvidence(item: BegEvidenceItem): boolean {
  return item.fileType === 'pdf' || item.fileName.toLowerCase().endsWith('.pdf');
}

export function BegEvidenceViewerModal({
  visible,
  evidence,
  selectedIndex = 0,
  loading = false,
  error = null,
  onClose,
  onSelectIndex,
}: BegEvidenceViewerModalProps) {
  const safeIndex = evidence.length > 0 ? Math.min(Math.max(selectedIndex, 0), evidence.length - 1) : 0;
  const selected = evidence[safeIndex] ?? null;
  const selectedUrl = selected?.url ?? null;
  const selectedIsPdf = selected ? isPdfEvidence(selected) : false;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Request evidence</Text>
              {selected ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {selected.fileName}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close evidence viewer"
            >
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
          </View>

          <View style={styles.viewer}>
            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color="#2E8BEA" />
                <Text style={styles.centerText}>Loading evidence...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerState}>
                <Ionicons name="alert-circle-outline" size={28} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : !selected || !selectedUrl ? (
              <View style={styles.centerState}>
                <Ionicons name="document-outline" size={28} color="#6B7280" />
                <Text style={styles.centerText}>No preview is available for this evidence.</Text>
              </View>
            ) : selectedIsPdf && Platform.OS === 'web' ? (
              createElement('iframe', {
                src: selectedUrl,
                title: selected.fileName,
                style: {
                  width: '100%',
                  height: '100%',
                  border: '0',
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                },
              })
            ) : selectedIsPdf ? (
              <View style={styles.centerState}>
                <Ionicons name="document-text-outline" size={32} color="#2E8BEA" />
                <Text style={styles.centerText}>
                  PDF evidence can be previewed in your device viewer.
                </Text>
                <Pressable
                  style={styles.nativePdfButton}
                  onPress={() => void Linking.openURL(selectedUrl)}
                >
                  <Text style={styles.nativePdfButtonText}>Open Preview</Text>
                </Pressable>
              </View>
            ) : (
              <Image source={{ uri: selectedUrl }} style={styles.image} resizeMode="contain" />
            )}
          </View>

          {evidence.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {evidence.map((item, index) => {
                const active = index === safeIndex;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.thumb, active && styles.thumbActive]}
                    onPress={() => onSelectIndex?.(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`View evidence ${index + 1}`}
                  >
                    <Ionicons
                      name={isPdfEvidence(item) ? 'document-text-outline' : 'image-outline'}
                      size={18}
                      color={active ? '#2E8BEA' : '#6B7280'}
                    />
                    <Text style={[styles.thumbText, active && styles.thumbTextActive]}>
                      {index + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 820,
    height: '88%',
    maxHeight: 720,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  viewer: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  centerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B91C1C',
    textAlign: 'center',
    fontWeight: '600',
  },
  nativePdfButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E8BEA',
    marginTop: 4,
  },
  nativePdfButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  thumbRow: {
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  thumb: {
    minWidth: 48,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
  },
  thumbActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  thumbText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
  },
  thumbTextActive: {
    color: '#2E8BEA',
  },
});
