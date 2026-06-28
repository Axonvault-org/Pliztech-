import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
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

export default function AdminMessagesScreen() {
  const { signOut } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<AdminChatSummary[]>([]);
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [replyBroadcastId, setReplyBroadcastId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chatRows, broadcastResult] = await withUnauthorizedRecovery(signOut, async (token) =>
        Promise.all([getUserAdminChats(token), getUserBroadcasts(token)])
      );
      setChats(chatRows);
      setBroadcasts(broadcastResult.broadcasts);
    } catch (e) {
      Alert.alert('Could not load messages', formatPlizApiErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  const loadMessages = useCallback(
    async (chatId: string) => {
      try {
        const result = await withUnauthorizedRecovery(signOut, (token) =>
          getUserChatMessages(token, chatId)
        );
        setMessages(result.messages);
      } catch (e) {
        Alert.alert('Could not load chat', formatPlizApiErrorForUser(e));
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

  const onSend = async () => {
    if (!activeChatId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const message = await withUnauthorizedRecovery(signOut, (token) =>
        sendUserChatMessage(token, activeChatId, draft.trim())
      );
      setMessages((prev) => [...prev, message]);
      setDraft('');
    } catch (e) {
      Alert.alert('Could not send message', formatPlizApiErrorForUser(e));
    } finally {
      setSending(false);
    }
  };

  const onReplyBroadcast = async () => {
    if (!replyBroadcastId || !replyDraft.trim() || sending) return;
    setSending(true);
    try {
      await withUnauthorizedRecovery(signOut, (token) =>
        replyToBroadcast(token, replyBroadcastId, replyDraft.trim())
      );
      setReplyBroadcastId(null);
      setReplyDraft('');
      Alert.alert('Reply sent', 'Support will see your response.');
    } catch (e) {
      Alert.alert('Could not send reply', formatPlizApiErrorForUser(e));
    } finally {
      setSending(false);
    }
  };

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  return (
    <Screen backgroundColor="#F9FAFB">
      <AppHeaderTitleRow title="Support messages" backIconColor="#9CA3AF" />
      {loading ? (
        <ActivityIndicator size="large" color="#2E8BEA" style={styles.loader} />
      ) : (
        <View style={styles.body}>
          <View style={styles.sidebar}>
            <Text style={styles.sectionLabel}>Direct chats</Text>
            {chats.length === 0 ? (
              <Text style={styles.empty}>No direct chats yet.</Text>
            ) : (
              chats.map((chat) => (
                <Pressable
                  key={chat.id}
                  style={[styles.listItem, activeChatId === chat.id && styles.listItemActive]}
                  onPress={() => setActiveChatId(chat.id)}
                >
                  <Text style={styles.listTitle}>{chat.admin.name}</Text>
                  <Text style={styles.listMeta}>{chat.status}</Text>
                </Pressable>
              ))
            )}
            <Text style={[styles.sectionLabel, styles.sectionGap]}>Announcements</Text>
            {broadcasts.length === 0 ? (
              <Text style={styles.empty}>No announcements.</Text>
            ) : (
              broadcasts.map((broadcast) => (
                <Pressable
                  key={broadcast.id}
                  style={styles.broadcastItem}
                  onPress={() => {
                    setReplyBroadcastId(broadcast.id);
                    setReplyDraft('');
                  }}
                >
                  <Text style={styles.listTitle}>{broadcast.title}</Text>
                  <Text style={styles.listMeta} numberOfLines={2}>
                    {broadcast.content}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
          <View style={styles.thread}>
            {!activeChat ? (
              <View style={styles.threadEmpty}>
                <Ionicons name="chatbubbles-outline" size={32} color="#9CA3AF" />
                <Text style={styles.empty}>Select a chat to view messages.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.threadTitle}>Chat with {activeChat.admin.name}</Text>
                <ScrollView style={styles.messageList} contentContainerStyle={styles.messageListContent}>
                  {messages.map((message) => (
                    <View
                      key={message.id}
                      style={[
                        styles.messageBubble,
                        message.senderType === 'user' ? styles.messageMine : styles.messageTheirs,
                      ]}
                    >
                      <Text style={styles.messageSender}>{message.senderName}</Text>
                      <Text style={styles.messageBody}>{message.content}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.composer}>
                  <TextInput
                    style={styles.input}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Write a message"
                    placeholderTextColor="#9CA3AF"
                    editable={!sending}
                  />
                  <Pressable style={styles.sendBtn} onPress={() => void onSend()} disabled={sending}>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      )}
      {replyBroadcastId ? (
        <View style={styles.replyBar}>
          <TextInput
            style={styles.input}
            value={replyDraft}
            onChangeText={setReplyDraft}
            placeholder="Reply to announcement"
            editable={!sending}
          />
          <Pressable style={styles.sendBtn} onPress={() => void onReplyBroadcast()} disabled={sending}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  body: { flex: 1, flexDirection: 'row', gap: 12, padding: 12 },
  sidebar: { width: 160, gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  sectionGap: { marginTop: 12 },
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
  },
  listItemActive: { borderColor: '#2E8BEA', backgroundColor: '#EFF6FF' },
  broadcastItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
  },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  listMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  empty: { fontSize: 13, color: '#6B7280' },
  thread: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
  threadEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  threadTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  messageList: { flex: 1 },
  messageListContent: { gap: 8, paddingBottom: 8 },
  messageBubble: { borderRadius: 10, padding: 10, maxWidth: '90%' },
  messageMine: { alignSelf: 'flex-end', backgroundColor: '#DBEAFE' },
  messageTheirs: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6' },
  messageSender: { fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4 },
  messageBody: { fontSize: 14, color: '#111827' },
  composer: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E8BEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
});
