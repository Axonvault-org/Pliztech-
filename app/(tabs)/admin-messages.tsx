import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import {
  avatarColorFromSeed,
  initialsFromDisplayName,
  useCurrentUser,
} from '@/contexts/CurrentUserContext';
import {
  getUserAdminChats,
  getUserBroadcasts,
  getUserChatMessages,
  replyToBroadcast,
  sendUserChatMessage,
  type AdminBroadcast,
  type AdminChatMessage,
  type AdminChatSummary,
} from '@/lib/api/admin-chat';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

const ACCENT = '#2E8BEA';

type InboxFilter = 'all' | 'chats' | 'announcements';

type InboxItem =
  | { kind: 'chat'; chat: AdminChatSummary; sortAt: number }
  | { kind: 'broadcast'; broadcast: AdminBroadcast; sortAt: number };

function formatInboxTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMessageTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function chatPreview(chat: AdminChatSummary): string {
  const last = chat.lastMessage ?? chat.messages?.[chat.messages.length - 1];
  if (!last) return chat.status === 'closed' ? 'Chat closed' : 'No messages yet';
  const prefix = last.senderType === 'user' ? 'You: ' : '';
  return `${prefix}${last.content}`;
}

function chatSortTime(chat: AdminChatSummary): number {
  const last = chat.lastMessage ?? chat.messages?.[chat.messages.length - 1];
  const iso = last?.createdAt ?? chat.updatedAt;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function SupportAvatar({
  name,
  variant = 'support',
  size = 48,
}: {
  name: string;
  variant?: 'support' | 'announcement';
  size?: number;
}) {
  const seed = name || 'support';
  const color = variant === 'announcement' ? '#7C3AED' : avatarColorFromSeed(seed);
  const initials = initialsFromDisplayName(name || 'Plz');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      {variant === 'announcement' ? (
        <Ionicons name="megaphone" size={size * 0.42} color="#FFFFFF" />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text>
      )}
    </View>
  );
}

function InboxRow({
  title,
  preview,
  timeLabel,
  unread,
  avatarName,
  avatarVariant,
  onPress,
}: {
  title: string;
  preview: string;
  timeLabel: string;
  unread?: boolean;
  avatarName: string;
  avatarVariant?: 'support' | 'announcement';
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.inboxRow, pressed && styles.inboxRowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <SupportAvatar name={avatarName} variant={avatarVariant} />
      <View style={styles.inboxContent}>
        <View style={styles.inboxTopLine}>
          <View style={styles.inboxTitleWrap}>
            <Text style={[styles.inboxTitle, unread && styles.inboxTitleUnread]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.supportBadge}>
              <Ionicons name="shield-checkmark" size={12} color={ACCENT} />
            </View>
          </View>
          <Text style={styles.inboxTime}>{timeLabel}</Text>
        </View>
        <View style={styles.inboxBottomLine}>
          <Text style={[styles.inboxPreview, unread && styles.inboxPreviewUnread]} numberOfLines={1}>
            {preview}
          </Text>
          {unread ? (
            <View style={styles.unreadDot} />
          ) : (
            <Ionicons name="checkmark-done" size={16} color="#CBD5E1" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons name="people-outline" size={16} color={active ? ACCENT : '#6B7280'} />
      <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>{label}</Text>
      <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
        <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>{count}</Text>
      </View>
      <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
    </Pressable>
  );
}

export default function AdminMessagesScreen() {
  const { signOut } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<AdminChatSummary[]>([]);
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeBroadcast, setActiveBroadcast] = useState<AdminBroadcast | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async (opts?: { background?: boolean }) => {
    const background = opts?.background ?? false;
    if (!background) setLoading(true);
    try {
      const [chatRows, broadcastResult] = await withUnauthorizedRecovery(signOut, async (token) =>
        Promise.all([getUserAdminChats(token), getUserBroadcasts(token)])
      );
      setChats(chatRows);
      setBroadcasts(broadcastResult.broadcasts);
    } catch (e) {
      Alert.alert('Could not load messages', formatPlizApiErrorForUser(e));
    } finally {
      if (!background) setLoading(false);
    }
  }, [signOut]);

  const loadMessages = useCallback(
    async (chatId: string) => {
      setMessagesLoading(true);
      try {
        const result = await withUnauthorizedRecovery(signOut, (token) =>
          getUserChatMessages(token, chatId)
        );
        setMessages(result.messages);
      } catch (e) {
        Alert.alert('Could not load chat', formatPlizApiErrorForUser(e));
      } finally {
        setMessagesLoading(false);
      }
    },
    [signOut]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (activeChatId) void loadMessages(activeChatId);
  }, [activeChatId, loadMessages]);

  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    }
  }, [messages, messagesLoading]);

  const inboxItems = useMemo((): InboxItem[] => {
    const chatItems: InboxItem[] = chats.map((chat) => ({
      kind: 'chat',
      chat,
      sortAt: chatSortTime(chat),
    }));
    const broadcastItems: InboxItem[] = broadcasts.map((broadcast) => ({
      kind: 'broadcast',
      broadcast,
      sortAt: Date.parse(broadcast.createdAt) || 0,
    }));

    let items = [...chatItems, ...broadcastItems];
    if (filter === 'chats') items = chatItems;
    if (filter === 'announcements') items = broadcastItems;
    return items.sort((a, b) => b.sortAt - a.sortAt);
  }, [broadcasts, chats, filter]);

  const totalCount = chats.length + broadcasts.length;
  const unreadChatCount = chats.filter((chat) => (chat.unreadCount ?? 0) > 0).length;

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ background: true });
      if (activeChatId) await loadMessages(activeChatId);
    } finally {
      setRefreshing(false);
    }
  }, [activeChatId, load, loadMessages]);

  const onSend = async () => {
    if (!activeChatId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const message = await withUnauthorizedRecovery(signOut, (token) =>
        sendUserChatMessage(token, activeChatId, draft.trim())
      );
      setMessages((prev) => [...prev, message]);
      setDraft('');
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                lastMessage: {
                  content: message.content,
                  senderType: 'user',
                  createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
                unreadCount: 0,
              }
            : chat
        )
      );
    } catch (e) {
      Alert.alert('Could not send message', formatPlizApiErrorForUser(e));
    } finally {
      setSending(false);
    }
  };

  const onReplyBroadcast = async () => {
    if (!activeBroadcast || !replyDraft.trim() || sending) return;
    setSending(true);
    try {
      await withUnauthorizedRecovery(signOut, (token) =>
        replyToBroadcast(token, activeBroadcast.id, replyDraft.trim())
      );
      setReplyDraft('');
      Alert.alert('Reply sent', 'Support will see your response.');
      setActiveBroadcast(null);
    } catch (e) {
      Alert.alert('Could not send reply', formatPlizApiErrorForUser(e));
    } finally {
      setSending(false);
    }
  };

  const openChat = (chatId: string) => {
    setActiveBroadcast(null);
    setActiveChatId(chatId);
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, unreadCount: 0 } : chat))
    );
  };

  const openBroadcast = (broadcast: AdminBroadcast) => {
    setActiveChatId(null);
    setActiveBroadcast(broadcast);
    setReplyDraft('');
  };

  const backToInbox = () => {
    setActiveChatId(null);
    setActiveBroadcast(null);
    setMessages([]);
    setDraft('');
    setReplyDraft('');
  };

  if (activeChat) {
    return (
      <Screen backgroundColor="#FFFFFF" contentStyle={styles.flex}>
        <AppHeaderTitleRow
          title={activeChat.admin.name}
          subtitle={activeChat.status === 'closed' ? 'Chat closed' : 'Plz Support'}
          onPressBack={backToInbox}
          backIconColor="#1F2937"
          showNotification={false}
          marginBottom={12}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {messagesLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={ACCENT} />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 ? (
                <View style={styles.threadEmpty}>
                  <SupportAvatar name={activeChat.admin.name} size={56} />
                  <Text style={styles.threadEmptyTitle}>Say hello to {activeChat.admin.name}</Text>
                  <Text style={styles.threadEmptyBody}>
                    This is a direct support conversation with the Plz team.
                  </Text>
                </View>
              ) : (
                messages.map((message) => {
                  const mine = message.senderType === 'user';
                  return (
                    <View
                      key={message.id}
                      style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowTheirs]}
                    >
                      {!mine ? (
                        <SupportAvatar name={message.senderName} size={28} />
                      ) : (
                        <View style={styles.messageAvatarSpacer} />
                      )}
                      <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleTheirs]}>
                        <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>{message.content}</Text>
                        <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
                          {formatMessageTime(message.createdAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          <View style={styles.composerWrap}>
            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message…"
                placeholderTextColor="#9CA3AF"
                editable={!sending && activeChat.status !== 'closed'}
                multiline
                maxLength={2000}
              />
              <Pressable
                style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
                onPress={() => void onSend()}
                disabled={!draft.trim() || sending || activeChat.status === 'closed'}
                accessibilityLabel="Send message"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  if (activeBroadcast) {
    return (
      <Screen backgroundColor="#FFFFFF" contentStyle={styles.flex}>
        <AppHeaderTitleRow
          title={activeBroadcast.title}
          subtitle="Announcement"
          onPressBack={backToInbox}
          backIconColor="#1F2937"
          showNotification={false}
          marginBottom={12}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView style={styles.flex} contentContainerStyle={styles.broadcastContent}>
            <View style={styles.broadcastCard}>
              <View style={styles.broadcastMetaRow}>
                <SupportAvatar name={activeBroadcast.adminName} variant="announcement" size={40} />
                <View style={styles.broadcastMetaText}>
                  <Text style={styles.broadcastFrom}>{activeBroadcast.adminName}</Text>
                  <Text style={styles.broadcastWhen}>{formatInboxTime(activeBroadcast.createdAt)}</Text>
                </View>
              </View>
              <Text style={styles.broadcastBody}>{activeBroadcast.content}</Text>
            </View>
          </ScrollView>

          <View style={styles.composerWrap}>
            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                value={replyDraft}
                onChangeText={setReplyDraft}
                placeholder="Reply to this announcement…"
                placeholderTextColor="#9CA3AF"
                editable={!sending}
                multiline
                maxLength={2000}
              />
              <Pressable
                style={[styles.sendBtn, (!replyDraft.trim() || sending) && styles.sendBtnDisabled]}
                onPress={() => void onReplyBroadcast()}
                disabled={!replyDraft.trim() || sending}
                accessibilityLabel="Send reply"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#FFFFFF" contentStyle={styles.flex}>
      <AppHeaderTitleRow
        title="Plz Support"
        subtitle="Inbox"
        backIconColor="#1F2937"
        showNotification={false}
        marginBottom={12}
      />

      <View style={styles.filterRow}>
        <FilterChip
          label={filter === 'all' ? 'All' : filter === 'chats' ? 'Chats' : 'Announcements'}
          count={
            filter === 'all'
              ? totalCount
              : filter === 'chats'
                ? chats.length
                : broadcasts.length
          }
          active
          onPress={() =>
            setFilter((current) =>
              current === 'all' ? 'chats' : current === 'chats' ? 'announcements' : 'all'
            )
          }
        />
        <Pressable style={styles.filterSort} accessibilityRole="button">
          <Ionicons name="funnel-outline" size={16} color="#6B7280" />
          <Text style={styles.filterSortText}>Newest</Text>
        </Pressable>
      </View>

      {unreadChatCount > 0 ? (
        <Text style={styles.unreadHint}>{unreadChatCount} unread conversation{unreadChatCount === 1 ? '' : 's'}</Text>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={inboxItems}
          keyExtractor={(item) =>
            item.kind === 'chat' ? `chat-${item.chat.id}` : `broadcast-${item.broadcast.id}`
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={ACCENT} />
          }
          contentContainerStyle={inboxItems.length === 0 ? styles.listEmpty : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={36} color={ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>No support messages yet</Text>
              <Text style={styles.emptyBody}>
                When the Plz team starts a conversation or sends an announcement, it will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === 'chat') {
              const last = item.chat.lastMessage ?? item.chat.messages?.[item.chat.messages.length - 1];
              const timeLabel = formatInboxTime(last?.createdAt ?? item.chat.updatedAt);
              const unread = (item.chat.unreadCount ?? 0) > 0;
              return (
                <InboxRow
                  title={item.chat.admin.name}
                  preview={chatPreview(item.chat)}
                  timeLabel={timeLabel}
                  unread={unread}
                  avatarName={item.chat.admin.name}
                  onPress={() => openChat(item.chat.id)}
                />
              );
            }

            return (
              <InboxRow
                title={item.broadcast.title}
                preview={item.broadcast.content}
                timeLabel={formatInboxTime(item.broadcast.createdAt)}
                avatarName={item.broadcast.adminName}
                avatarVariant="announcement"
                onPress={() => openBroadcast(item.broadcast)}
              />
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
  },
  filterChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterChipLabelActive: {
    color: ACCENT,
  },
  filterBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  filterBadgeActive: {
    backgroundColor: ACCENT,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  filterSort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterSortText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  unreadHint: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  listEmpty: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginLeft: 72,
  },
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  inboxRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inboxContent: {
    flex: 1,
    minWidth: 0,
  },
  inboxTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  inboxTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  inboxTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  inboxTitleUnread: {
    fontWeight: '800',
  },
  supportBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  inboxBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inboxPreview: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  inboxPreviewUnread: {
    color: '#374151',
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },
  threadContent: {
    paddingVertical: 12,
    paddingBottom: 16,
    flexGrow: 1,
  },
  threadEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    gap: 8,
  },
  threadEmptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  threadEmptyBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowTheirs: {
    justifyContent: 'flex-start',
  },
  messageAvatarSpacer: {
    width: 28,
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleMine: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: 6,
  },
  messageBubbleTheirs: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 6,
  },
  messageBody: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 21,
  },
  messageBodyMine: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 4 : 10,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  composerInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    maxHeight: 120,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  broadcastContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  broadcastCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  broadcastMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  broadcastMetaText: {
    flex: 1,
  },
  broadcastFrom: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  broadcastWhen: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  broadcastBody: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
});
