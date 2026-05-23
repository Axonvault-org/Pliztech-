/**
 * KYC feature flags — must align with backend KYC_REQUIRE_FACE_LIVENESS.
 * Default false for launch (passport verifies without selfie).
 */
export const KYC_REQUIRE_FACE_LIVENESS =
  process.env.EXPO_PUBLIC_KYC_REQUIRE_FACE_LIVENESS === 'true';
