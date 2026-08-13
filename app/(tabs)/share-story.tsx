import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { StorySubmittedModal } from '@/components/story/StorySubmittedModal';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { createStory } from '@/lib/api/stories';
import { updateProfile } from '@/lib/api/profile';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

const STORY_MAX_CHARS = 500;
const STORY_MAX_WORDS = 60;
const STORY_MIN_CHARS = 10;

function firstQueryParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value[0]) return String(value[0]).trim();
  return '';
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export default function ShareStoryScreen() {
  const params = useLocalSearchParams<{ prefill?: string }>();
  const prefillFromRoute = firstQueryParam(params.prefill);
  const { user, refreshUser, signOut } = useCurrentUser();
  const [body, setBody] = useState('');
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (prefillFromRoute && !prefillAppliedRef.current) {
      setBody(prefillFromRoute.slice(0, STORY_MAX_CHARS));
      prefillAppliedRef.current = true;
    }
  }, [prefillFromRoute]);

  const [anonymous, setAnonymous] = useState(user?.profile?.isAnonymous ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const trimmed = body.trim();
  const words = countWords(trimmed);
  const overLimit = trimmed.length > STORY_MAX_CHARS || words > STORY_MAX_WORDS;
  const canSubmit =
    trimmed.length >= STORY_MIN_CHARS && !overLimit && !submitting;

  const submit = async () => {
    if (!canSubmit || overLimit) return;
    setSubmitting(true);
    try {
      await withUnauthorizedRecovery(signOut, async (token) => {
        if (anonymous !== user?.profile?.isAnonymous) {
          await updateProfile(token, { isAnonymous: anonymous });
          await refreshUser();
        }
        const { message } = await createStory(token, { content: trimmed });
        setSuccessMessage(message);
      });
    } catch (e) {
      Alert.alert(
        'Could not submit',
        formatPlizApiErrorForUser(e).includes('objectionable content')
          ? 'Your story includes language that is not allowed on Plz. Please revise it and try again.'
          : formatPlizApiErrorForUser(e)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Share your story" />

      <Text style={styles.lead}>
        Up to {STORY_MAX_WORDS} words and {STORY_MAX_CHARS} characters. Stories are reviewed
        before they appear in the feed.
      </Text>

      <Text style={styles.label}>Your story</Text>
      <TextInput
        style={styles.input}
        multiline
        textAlignVertical="top"
        placeholder="What happened? How did support from others make a difference?"
        placeholderTextColor="#9CA3AF"
        value={body}
        onChangeText={setBody}
        maxLength={STORY_MAX_CHARS}
      />
      <Text style={[styles.wordCount, overLimit && styles.wordCountError]}>
        {words} / {STORY_MAX_WORDS} words · {body.length} / {STORY_MAX_CHARS} characters
        {trimmed.length > 0 && trimmed.length < STORY_MIN_CHARS
          ? ` · At least ${STORY_MIN_CHARS} characters`
          : ''}
      </Text>

      <View style={styles.anonRow}>
        <View style={styles.anonTextWrap}>
          <Text style={styles.label}>Post anonymously</Text>
          <Text style={styles.anonHint}>
            When on, your story shows as Anonymous (same as your profile privacy setting).
          </Text>
        </View>
        <Switch
          value={anonymous}
          onValueChange={setAnonymous}
          trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
          thumbColor={anonymous ? '#2E8BEA' : '#F3F4F6'}
        />
      </View>

      <Pressable
        style={[styles.submit, (!canSubmit || submitting) && styles.submitDisabled]}
        onPress={() => void submit()}
        disabled={!canSubmit || submitting}
        accessibilityRole="button"
        accessibilityLabel="Submit story"
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Submit story</Text>
        )}
      </Pressable>
      <StorySubmittedModal
        visible={successMessage != null}
        message={successMessage ?? undefined}
        onDone={() => {
          setSuccessMessage(null);
          router.replace('/(tabs)/(main)' as Href);
        }}
        onViewStories={() => {
          setSuccessMessage(null);
          router.replace('/(tabs)/stories-feed' as Href);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  wordCount: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  wordCountError: {
    color: '#DC2626',
    fontWeight: '600',
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  anonTextWrap: {
    flex: 1,
  },
  anonHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  submit: {
    backgroundColor: '#2E8BEA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
