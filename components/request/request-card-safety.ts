import type { RequestSafetyTarget } from '@/hooks/useRequestSafetyActions';

export type RequestCardSafetyProps = {
  target: RequestSafetyTarget;
  isHidden: boolean;
  isBlocked: boolean;
  showFlag?: boolean;
  onToggleHidden: (target: RequestSafetyTarget) => void | Promise<void>;
  onToggleBlocked: (target: RequestSafetyTarget) => void | Promise<void>;
  onFlag?: () => void;
};

type BuildRequestCardSafetyMenuArgs = {
  begId: string;
  ownerUserId: string;
  hiddenBegIds: ReadonlySet<string>;
  blockedUserIds: ReadonlySet<string>;
  toggleHidden: (target: RequestSafetyTarget) => void | Promise<void>;
  toggleBlocked: (target: RequestSafetyTarget) => void | Promise<void>;
  runFlag: (target: RequestSafetyTarget) => void;
  onFlag?: () => void;
  onHidden?: () => void;
  onUnhidden?: () => void;
  onBlocked?: () => void;
  onUnblocked?: () => void;
  showFlag?: boolean;
};

export function buildRequestCardSafetyMenu({
  begId,
  ownerUserId,
  hiddenBegIds,
  blockedUserIds,
  toggleHidden,
  toggleBlocked,
  runFlag,
  onFlag,
  onHidden,
  onUnhidden,
  onBlocked,
  onUnblocked,
  showFlag,
}: BuildRequestCardSafetyMenuArgs): RequestCardSafetyProps {
  const target: RequestSafetyTarget = {
    begId,
    ownerUserId,
    onFlag,
    onHidden,
    onUnhidden,
    onBlocked,
    onUnblocked,
  };

  return {
    target,
    isHidden: hiddenBegIds.has(begId),
    isBlocked: blockedUserIds.has(ownerUserId),
    showFlag: showFlag ?? Boolean(onFlag),
    onToggleHidden: toggleHidden,
    onToggleBlocked: toggleBlocked,
    onFlag: onFlag ? () => runFlag(target) : undefined,
  };
}
