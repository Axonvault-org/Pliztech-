import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  deleteSavedCard,
  formatCardBrandLabel,
  getSavedCards,
  setDefaultSavedCard,
  type SavedCard,
} from '@/lib/api/payment-methods';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';
import { formatExpiry } from '@/lib/types/payment-cards';

const ACCENT_BLUE = '#2E8BEA';
const BORDER_GRAY = '#E5E7EB';
const BG_LIGHT = '#F9FAFB';

function savedCardToDisplay(card: SavedCard) {
  return {
    id: card.id,
    brand: formatCardBrandLabel(card.cardType),
    last4: card.last4,
    expiryMonth: card.expMonth,
    expiryYear: card.expYear,
    isDefault: card.isDefault,
    bank: card.bank,
  };
}

type DisplayCard = ReturnType<typeof savedCardToDisplay>;

function PaymentCardItem({
  card,
  busyId,
  onSetDefault,
  onRemove,
}: {
  card: DisplayCard;
  busyId: string | null;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const expiry = formatExpiry(card.expiryMonth, card.expiryYear);
  const busy = busyId === card.id;

  return (
    <View style={styles.cardItem}>
      <View style={styles.cardIcon}>
        <Ionicons name="card-outline" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardBrand}>
          {card.brand} •••• {card.last4}
        </Text>
        {card.bank ? <Text style={styles.cardBank}>{card.bank}</Text> : null}
        <Text style={styles.cardExpiry}>Expires {expiry}</Text>
        {card.isDefault ? <Text style={styles.defaultLabel}>Default</Text> : null}
        <View style={styles.cardActions}>
          {!card.isDefault ? (
            <Pressable
              onPress={() => onSetDefault(card.id)}
              disabled={busy}
              style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Set as default card"
            >
              <Text style={styles.actionLinkText}>Set as default</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => onRemove(card.id)}
            disabled={busy}
            style={({ pressed }) => [styles.actionLinkDanger, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Remove card"
          >
            <Text style={styles.actionLinkDangerText}>Remove</Text>
          </Pressable>
        </View>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={ACCENT_BLUE} style={styles.rowSpinner} />
      ) : null}
    </View>
  );
}

export default function PaymentCardsScreen() {
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = typeof params.requestId === 'string'
    ? params.requestId
    : params.requestId?.[0];
  const { signOut } = useCurrentUser();

  const [cards, setCards] = useState<DisplayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addCardInfoVisible, setAddCardInfoVisible] = useState(false);

  const loadCards = useCallback(
    async (opts?: { background?: boolean; _retryAfterRefresh?: boolean }) => {
      const background = opts?.background ?? false;
      const retryAfterRefresh = opts?._retryAfterRefresh ?? false;
      if (!background) {
        setLoading(true);
      }
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) {
          setCards([]);
          setError('Sign in to manage saved cards.');
          return;
        }
        const list = await getSavedCards(token);
        setCards(list.map(savedCardToDisplay));
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await loadCards({ background, _retryAfterRefresh: true });
            return;
          }
          return;
        }
        setError(formatPlizApiErrorForUser(e));
        if (!background) {
          setCards([]);
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [signOut]
  );

  useFocusEffect(
    useCallback(() => {
      void loadCards();
    }, [loadCards])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCards({ background: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadCards]);

  const handleSetDefault = (cardId: string) => {
    void (async () => {
      setBusyId(cardId);
      try {
        const token = await getAccessToken();
        if (!token) return;
        await setDefaultSavedCard(token, cardId);
        setCards((prev) =>
          prev.map((c) => ({
            ...c,
            isDefault: c.id === cardId,
          }))
        );
      } catch (e) {
        if (isUnauthorizedSessionError(e)) {
          await recoverFromUnauthorized(signOut);
          return;
        }
        Alert.alert('Something went wrong', formatPlizApiErrorForUser(e));
      } finally {
        setBusyId(null);
      }
    })();
  };

  const handleRemove = (cardId: string) => {
    Alert.alert(
      'Remove this card?',
      'You won’t be able to pay with it again until you add it through a new checkout.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusyId(cardId);
              try {
                const token = await getAccessToken();
                if (!token) return;
                await deleteSavedCard(token, cardId);
                setCards((prev) => prev.filter((c) => c.id !== cardId));
              } catch (e) {
                if (isUnauthorizedSessionError(e)) {
                  await recoverFromUnauthorized(signOut);
                  return;
                }
                Alert.alert('Something went wrong', formatPlizApiErrorForUser(e));
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ]
    );
  };

  const openAddCardInfo = () => setAddCardInfoVisible(true);
  const closeAddCardInfo = () => setAddCardInfoVisible(false);

  const goBrowseToAddCard = () => {
    closeAddCardInfo();
    router.push('/(tabs)/(main)/browse');
  };

  const goRequestToAddCard = () => {
    closeAddCardInfo();
    if (requestId) {
      router.push({ pathname: '/(tabs)/request/[id]', params: { id: requestId } });
    } else {
      router.push('/(tabs)/(main)/browse');
    }
  };

  return (
    <Screen backgroundColor={BG_LIGHT}>
      <AppHeaderTitleRow title="Payment Cards" />

      {requestId ? (
        <Text style={styles.contextHint}>
          Choose a default card for faster checkout on this request.
        </Text>
      ) : null}

      {loading && cards.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT_BLUE} />
          <Text style={styles.loadingText}>Loading cards…</Text>
        </View>
      ) : null}

      {error && !loading ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadCards()} style={styles.retryBtn}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={ACCENT_BLUE} />
        }
      >
        {!loading && cards.length === 0 && !error ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="card-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No saved cards yet</Text>
            <Text style={styles.emptySubtitle}>
              Pay with a card on a request checkout. If the card is reusable, it will show up here for next time.
            </Text>
          </View>
        ) : null}

        {cards.map((card) => (
          <PaymentCardItem
            key={card.id}
            card={card}
            busyId={busyId}
            onSetDefault={handleSetDefault}
            onRemove={handleRemove}
          />
        ))}

        <Pressable
          style={styles.addButton}
          onPress={openAddCardInfo}
          accessibilityLabel="How to add a card"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={22} color={ACCENT_BLUE} />
          <Text style={styles.addButtonText}>Add New Card</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={addCardInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddCardInfo}
      >
        <Pressable style={styles.infoModalOverlay} onPress={closeAddCardInfo}>
          <Pressable style={styles.infoModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.infoModalTitle}>Add a card</Text>
            <Text style={styles.infoModalBody}>
              For your security, Plz doesn&apos;t store card numbers in the app. When you donate on a
              request with a reusable card, we can save it to your account and
              it will show up here for next time.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.infoModalPrimary, pressed && styles.pressed]}
              onPress={goRequestToAddCard}
              accessibilityRole="button"
              accessibilityLabel={requestId ? 'Open request to donate' : 'Browse requests to donate'}
            >
              <Text style={styles.infoModalPrimaryLabel}>
                {requestId ? 'Open request & donate' : 'Browse requests'}
              </Text>
            </Pressable>
            {requestId ? (
              <Pressable
                style={({ pressed }) => [styles.infoModalSecondary, pressed && styles.pressed]}
                onPress={goBrowseToAddCard}
                accessibilityRole="button"
              >
                <Text style={styles.infoModalSecondaryLabel}>Browse all requests</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.infoModalTertiary, pressed && styles.pressed]}
              onPress={closeAddCardInfo}
              accessibilityRole="button"
            >
              <Text style={styles.infoModalTertiaryLabel}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contextHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    marginBottom: 10,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: ACCENT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardBank: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  defaultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT_BLUE,
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 4,
  },
  actionLink: {
    paddingVertical: 4,
  },
  actionLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
  actionLinkDanger: {
    paddingVertical: 4,
  },
  actionLinkDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  pressed: {
    opacity: 0.7,
  },
  rowSpinner: {
    marginLeft: 8,
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCENT_BLUE,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  infoModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoModalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    marginBottom: 24,
  },
  infoModalPrimary: {
    backgroundColor: ACCENT_BLUE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  infoModalPrimaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoModalSecondary: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  infoModalSecondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  infoModalTertiary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  infoModalTertiaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
});
