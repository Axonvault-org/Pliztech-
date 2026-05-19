import { useCallback, useState } from 'react';

import { KycImageSourceModal } from '@/components/kyc/KycImageSourceModal';
import {
  pickKycDocumentFromCamera,
  pickKycDocumentFromLibrary,
  pickKycSelfieFromCamera,
  pickKycSelfieFromLibrary,
  type PickedKycFile,
} from '@/lib/kyc/helpers';

type PendingRequest =
  | { kind: 'document'; prefix: string; resolve: (file: PickedKycFile | null) => void }
  | { kind: 'selfie'; resolve: (file: PickedKycFile | null) => void };

export function useKycImagePicker() {
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = useCallback((file: PickedKycFile | null) => {
    pending?.resolve(file);
    setPending(null);
    setBusy(false);
  }, [pending]);

  const pickDocument = useCallback((prefix: string) => {
    return new Promise<PickedKycFile | null>((resolve) => {
      setPending({ kind: 'document', prefix, resolve });
    });
  }, []);

  const pickSelfie = useCallback(() => {
    return new Promise<PickedKycFile | null>((resolve) => {
      setPending({ kind: 'selfie', resolve });
    });
  }, []);

  const onCamera = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const file =
        pending.kind === 'selfie'
          ? await pickKycSelfieFromCamera()
          : await pickKycDocumentFromCamera(pending.prefix);
      finish(file);
    } catch {
      finish(null);
    }
  }, [pending, busy, finish]);

  const onGallery = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const file =
        pending.kind === 'selfie'
          ? await pickKycSelfieFromLibrary()
          : await pickKycDocumentFromLibrary(pending.prefix);
      finish(file);
    } catch {
      finish(null);
    }
  }, [pending, busy, finish]);

  const modal = (
    <KycImageSourceModal
      visible={pending != null}
      title={pending?.kind === 'selfie' ? 'Take a selfie' : 'Upload document'}
      message={
        pending?.kind === 'selfie'
          ? 'Use a clear, well-lit photo of your face.'
          : 'Choose how to add your document photo.'
      }
      onCamera={() => void onCamera()}
      onGallery={() => void onGallery()}
      onCancel={() => finish(null)}
    />
  );

  return { pickDocument, pickSelfie, modal, picking: pending != null || busy };
}
