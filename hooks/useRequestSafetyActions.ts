import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { hideBeg, unhideBeg } from '@/lib/api/beg';
import { blockUser, unblockUser } from '@/lib/api/blocks';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';
import { queryKeys } from '@/lib/query/query-keys';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useInvalidateAppQueries } from '@/hooks/queries/useInvalidateAppQueries';
import { useUserSafetySets } from '@/hooks/useUserSafetySets';

export type RequestSafetyTarget = {
  begId: string;
  ownerUserId: string;
  /** Called when the user chooses to flag/report this request. */
  onFlag?: () => void;
  /** Called after a beg is hidden from the feed. */
  onHidden?: () => void;
  /** Called after a beg is restored to the feed. */
  onUnhidden?: () => void;
  /** Called after a user is blocked. */
  onBlocked?: () => void;
  /** Called after a user is unblocked. */
  onUnblocked?: () => void;
};

export function useRequestSafetyActions() {
  const { signOut } = useCurrentUser();
  const queryClient = useQueryClient();
  const invalidateAppQueries = useInvalidateAppQueries();
  const { hiddenBegIds, blockedUserIds } = useUserSafetySets();

  const refreshSafetyAndFeeds = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.hiddenBegIds }),
      queryClient.invalidateQueries({ queryKey: queryKeys.blockedUserIds }),
      invalidateAppQueries('all'),
    ]);
  }, [queryClient, invalidateAppQueries]);

  const showRequestSafetyMenu = useCallback(
    (target: RequestSafetyTarget) => {
      const { begId, ownerUserId, onFlag, onHidden, onUnhidden, onBlocked, onUnblocked } = target;
      const isHidden = hiddenBegIds.has(begId);
      const isBlocked = blockedUserIds.has(ownerUserId);

      const buttons: {
        text: string;
        style?: 'default' | 'cancel' | 'destructive';
        onPress?: () => void;
      }[] = [];

      buttons.push({
        text: isHidden ? 'Un-hide from feed' : 'Hide from feed',
        onPress: () =>
          void (async () => {
            try {
              if (isHidden) {
                await withUnauthorizedRecovery(signOut, (token) => unhideBeg(token, begId));
                Alert.alert('Restored', 'This request will appear in your feed again.');
              } else {
                await withUnauthorizedRecovery(signOut, (token) => hideBeg(token, begId));
                Alert.alert('Hidden', 'This request will no longer appear in your feed.');
              }
              await refreshSafetyAndFeeds();
              if (isHidden) {
                onUnhidden?.();
              } else {
                onHidden?.();
              }
            } catch (e) {
              Alert.alert(
                isHidden ? 'Could not un-hide request' : 'Could not hide request',
                formatPlizApiErrorForUser(e)
              );
            }
          })(),
      });

      buttons.push({
        text: isBlocked ? 'Unblock user' : 'Block user',
        style: isBlocked ? 'default' : 'destructive',
        onPress: () =>
          void (async () => {
            try {
              if (isBlocked) {
                await withUnauthorizedRecovery(signOut, (token) =>
                  unblockUser(token, ownerUserId)
                );
                Alert.alert('User unblocked', 'You can see content from this user again.');
              } else {
                await withUnauthorizedRecovery(signOut, (token) =>
                  blockUser(token, ownerUserId)
                );
                Alert.alert('User blocked', 'You will no longer see content from this user.');
              }
              await refreshSafetyAndFeeds();
              if (isBlocked) {
                onUnblocked?.();
              } else {
                onBlocked?.();
              }
            } catch (e) {
              Alert.alert(
                isBlocked ? 'Could not unblock user' : 'Could not block user',
                formatPlizApiErrorForUser(e)
              );
            }
          })(),
      });

      if (onFlag) {
        buttons.push({
          text: 'Flag request',
          onPress: onFlag,
        });
      }

      buttons.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert('Request options', undefined, buttons);
    },
    [hiddenBegIds, blockedUserIds, signOut, refreshSafetyAndFeeds]
  );

  const defaultOnBlocked = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/(main)' as import('expo-router').Href);
    }
  }, []);

  return { showRequestSafetyMenu, defaultOnBlocked };
}
