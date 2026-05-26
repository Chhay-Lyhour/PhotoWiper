import * as MediaLibrary from 'expo-media-library';

export type PermissionState = 'granted' | 'limited' | 'denied' | 'blocked' | 'undetermined';

export type PermissionResult = {
  state: PermissionState;
  canAskAgain: boolean;
};

function toState(res: MediaLibrary.PermissionResponse): PermissionResult {
  if (res.status === 'granted') {
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

export async function requestPhotoPermission(): Promise<PermissionResult> {
  const res = await MediaLibrary.requestPermissionsAsync();
  return toState(res);
}

export async function checkPhotoPermission(): Promise<PermissionResult> {
  const res = await MediaLibrary.getPermissionsAsync();
  return toState(res);
}

export function isUsable(state: PermissionState): boolean {
  return state === 'granted' || state === 'limited';
}
