import * as MediaLibrary from 'expo-media-library';

export type PermissionState = 'granted' | 'limited' | 'denied' | 'blocked' | 'undetermined';

export type PermissionResult = {
  state: PermissionState;
  canAskAgain: boolean;
};

function toState(res: MediaLibrary.PermissionResponse): PermissionResult {
  // Temporary diagnostic: log the raw response so we can see exactly what the
  // device reports (Android Expo Go behaves differently from iOS).
  console.log('[permissions] raw response:', JSON.stringify({
    status: res.status,
    granted: res.granted,
    accessPrivileges: res.accessPrivileges,
    canAskAgain: res.canAskAgain,
  }));

  // Use the boolean `granted` as the primary signal — on some Android/Expo Go
  // versions the `status` string lags or differs from the real grant state.
  if (res.granted || res.status === 'granted') {
    const isLimited = res.accessPrivileges === 'limited';
    return { state: isLimited ? 'limited' : 'granted', canAskAgain: res.canAskAgain };
  }
  if (res.status === 'denied') {
    return {
      state: res.canAskAgain ? 'denied' : 'blocked',
      canAskAgain: res.canAskAgain,
    };
  }
  return { state: 'undetermined', canAskAgain: res.canAskAgain };
}

// Request ONLY the photo permission. Passing the granular ['photo'] list keeps
// us from also asking for AUDIO — which Android 13+ rejects (READ_MEDIA_AUDIO
// isn't declared in Expo Go's manifest), causing the whole request to throw and
// the prompt to never appear. The granular arg is ignored on iOS.
export async function requestPhotoPermission(): Promise<PermissionResult> {
  try {
    const res = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    return toState(res);
  } catch (e) {
    // Expo Go on Android hard-rejects this call ("Expo Go can no longer provide
    // full access to the media library"). There is no JS workaround — full media
    // access requires a development build. Treat it as blocked so the UI can
    // prompt the user instead of crashing.
    console.warn('[permissions] requestPermissionsAsync rejected — likely Expo Go on Android. Use a development build for full media access.', e);
    return { state: 'blocked', canAskAgain: false };
  }
}

export async function checkPhotoPermission(): Promise<PermissionResult> {
  try {
    const res = await MediaLibrary.getPermissionsAsync(false, ['photo']);
    return toState(res);
  } catch (e) {
    // Same Expo Go on Android limitation as requestPhotoPermission.
    console.warn('[permissions] getPermissionsAsync rejected — likely Expo Go on Android. Use a development build for full media access.', e);
    return { state: 'blocked', canAskAgain: false };
  }
}

export function isUsable(state: PermissionState): boolean {
  return state === 'granted' || state === 'limited';
}
