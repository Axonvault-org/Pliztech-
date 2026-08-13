import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  getStoryStatus,
  markStoriesSeen as markStoriesSeenApi,
} from '@/lib/api/stories';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

type StoryIndicatorContextValue = {
  hasUnseenStories: boolean;
  refreshStoryStatus: () => Promise<void>;
  markStoriesSeen: () => Promise<void>;
};

const StoryIndicatorContext = createContext<StoryIndicatorContextValue | null>(null);

export function StoryIndicatorProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useCurrentUser();
  const [hasUnseenStories, setHasUnseenStories] = useState(false);

  const refreshStoryStatus = useCallback(async () => {
    if (!user) {
      setHasUnseenStories(false);
      return;
    }

    try {
      const status = await withUnauthorizedRecovery(signOut, (token) => getStoryStatus(token));
      setHasUnseenStories(status.hasUnseenStories);
    } catch {
      setHasUnseenStories(false);
    }
  }, [signOut, user]);

  const markStoriesSeen = useCallback(async () => {
    if (!user) {
      setHasUnseenStories(false);
      return;
    }

    setHasUnseenStories(false);
    try {
      const status = await withUnauthorizedRecovery(signOut, (token) =>
        markStoriesSeenApi(token)
      );
      setHasUnseenStories(status.hasUnseenStories);
    } catch {
      void refreshStoryStatus();
    }
  }, [refreshStoryStatus, signOut, user]);

  useEffect(() => {
    void refreshStoryStatus();
  }, [refreshStoryStatus]);

  const value = useMemo(
    () => ({ hasUnseenStories, refreshStoryStatus, markStoriesSeen }),
    [hasUnseenStories, markStoriesSeen, refreshStoryStatus]
  );

  return (
    <StoryIndicatorContext.Provider value={value}>
      {children}
    </StoryIndicatorContext.Provider>
  );
}

export function useStoryIndicator(): StoryIndicatorContextValue {
  const ctx = useContext(StoryIndicatorContext);
  if (!ctx) {
    throw new Error('useStoryIndicator must be used inside StoryIndicatorProvider');
  }
  return ctx;
}
