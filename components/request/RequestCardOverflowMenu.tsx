import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { Text } from '@/components/Text';

import type { RequestSafetyTarget } from '@/hooks/useRequestSafetyActions';

const DROPDOWN_WIDTH = 188;
const DROPDOWN_GAP = 4;

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RequestCardOverflowMenuProps = {
  target: RequestSafetyTarget;
  isHidden: boolean;
  isBlocked: boolean;
  showFlag?: boolean;
  variant?: 'card' | 'header';
  onToggleHidden: (target: RequestSafetyTarget) => void | Promise<void>;
  onToggleBlocked: (target: RequestSafetyTarget) => void | Promise<void>;
  onFlag?: () => void;
};

export function RequestCardOverflowMenu({
  target,
  isHidden,
  isBlocked,
  showFlag = false,
  variant = 'card',
  onToggleHidden,
  onToggleBlocked,
  onFlag,
}: RequestCardOverflowMenuProps) {
  const { width: windowWidth } = useWindowDimensions();
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setAnchorRect(null);
  }, []);

  const openMenu = useCallback(() => {
    const node = anchorRef.current;
    if (!node) return;

    node.measureInWindow((x, y, width, height) => {
      setAnchorRect({ x, y, width, height });
      setOpen(true);
    });
  }, []);

  const handleToggle = useCallback(() => {
    if (open) {
      close();
      return;
    }
    openMenu();
  }, [close, open, openMenu]);

  const dropdownLeft = anchorRect
    ? Math.min(
        Math.max(8, anchorRect.x + anchorRect.width - DROPDOWN_WIDTH),
        windowWidth - DROPDOWN_WIDTH - 8
      )
    : 0;

  const dropdownTop = anchorRect
    ? anchorRect.y + anchorRect.height + DROPDOWN_GAP
    : 0;

  return (
    <>
      <View
        ref={anchorRef}
        collapsable={false}
        style={[styles.host, variant === 'header' && styles.hostHeader]}
      >
        <TouchableOpacity
          onPress={handleToggle}
          activeOpacity={0.7}
          style={[styles.button, variant === 'header' && styles.buttonHeader]}
          accessibilityLabel="More options"
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <Modal visible={open && anchorRect != null} transparent animationType="none" onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={close} accessibilityLabel="Close menu" />
          <View
            style={[
              styles.dropdown,
              {
                top: dropdownTop,
                left: dropdownLeft,
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => {
                close();
                void onToggleHidden(target);
              }}
            >
              <Text style={styles.menuItemText}>
                {isHidden ? 'Un-hide from feed' : 'Hide from feed'}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                !isBlocked && styles.menuItemDestructive,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => {
                close();
                void onToggleBlocked(target);
              }}
            >
              <Text style={[styles.menuItemText, !isBlocked && styles.menuItemDestructiveText]}>
                {isBlocked ? 'Unblock user' : 'Block user'}
              </Text>
            </Pressable>
            {showFlag && onFlag ? (
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => {
                  close();
                  onFlag();
                }}
              >
                <Text style={styles.menuItemText}>Flag request</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginLeft: 4,
    marginRight: -6,
  },
  hostHeader: {
    marginLeft: 0,
    marginRight: 0,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    width: DROPDOWN_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 2,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemDestructive: {
    backgroundColor: 'transparent',
  },
  menuItemPressed: {
    backgroundColor: '#F3F4F6',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemDestructiveText: {
    color: '#DC2626',
  },
});
