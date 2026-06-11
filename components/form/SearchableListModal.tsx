import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useState } from 'react';

import { Text } from '@/components/Text';

type SearchableListModalProps = {
  visible: boolean;
  title: string;
  items: string[];
  onSelect: (item: string) => void;
  onClose: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
};

export function SearchableListModal({
  visible,
  title,
  items,
  onSelect,
  onClose,
  searchable = true,
  searchPlaceholder = 'Search',
}: SearchableListModalProps) {
  const [search, setSearch] = useState('');

  const filtered = searchable
    ? items.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {searchable ? (
            <TextInput
              style={styles.search}
              placeholder={searchPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.item}
                onPress={() => {
                  onSelect(item);
                  setSearch('');
                }}
              >
                <Text style={styles.itemText}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '72%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  search: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
    color: '#1F2937',
  },
  list: {
    flexGrow: 0,
  },
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemText: {
    fontSize: 16,
    color: '#1F2937',
  },
});
