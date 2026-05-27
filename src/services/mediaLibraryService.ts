import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import type { Photo } from '../types';

const PAGE_SIZE = 200;

function toPhoto(asset: MediaLibrary.Asset): Photo {
  return {
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename,
    width: asset.width,
    height: asset.height,
    creationTime: asset.creationTime,
    modificationTime: asset.modificationTime,
    mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
  };
}

export type IndexProgress = {
  fetched: number;
  total: number;
};

export async function fetchPage(
  after?: string,
  first: number = PAGE_SIZE,
): Promise<{ photos: Photo[]; endCursor: string; hasNextPage: boolean; totalCount: number }> {
  const page = await MediaLibrary.getAssetsAsync({
    mediaType: ['photo'],
    sortBy: [['creationTime', false]],
    first,
    after,
  });
  return {
    photos: page.assets.map(toPhoto),
    endCursor: page.endCursor,
    hasNextPage: page.hasNextPage,
    totalCount: page.totalCount,
  };
}

export async function fetchAll(
  onProgress?: (p: IndexProgress) => void,
): Promise<Photo[]> {
  const out: Photo[] = [];
  let after: string | undefined;
  let total = 0;

  for (;;) {
    const page = await fetchPage(after);
    if (!total) total = page.totalCount;
    out.push(...page.photos);
    onProgress?.({ fetched: out.length, total });
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return out;
}

export async function getAssetInfo(id: string) {
  return MediaLibrary.getAssetInfoAsync(id);
}

/**
 * MediaLibrary.getAssetsAsync() does not return fileSize on iOS — only
 * getAssetInfoAsync(id) does. Falls back to FileSystem.getInfoAsync on the
 * localUri if getAssetInfoAsync doesn't populate the size (e.g. iCloud-backed
 * photos that haven't been downloaded yet).
 *
 * Runs all lookups in parallel. Any individual failure leaves that photo's
 * fileSize untouched (caller's responsibility to handle undefined).
 */
export async function enrichWithFileSize(photos: Photo[]): Promise<Photo[]> {
  return Promise.all(
    photos.map(async (p) => {
      if (p.fileSize != null && p.fileSize > 0) return p;
      try {
        // AssetInfo does have fileSize at runtime but the SDK 54 types omit it
        const info = await MediaLibrary.getAssetInfoAsync(p.id) as MediaLibrary.AssetInfo & { fileSize?: number };

        // Primary: fileSize from MediaLibrary (bytes, available when asset is local)
        if (info.fileSize != null && info.fileSize > 0) {
          return { ...p, fileSize: info.fileSize };
        }

        // Fallback: measure the local file directly via FileSystem
        const uri = info.localUri ?? p.uri;
        if (uri) {
          // expo-file-system v19 returns size directly without needing an option flag
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists && 'size' in fileInfo && (fileInfo.size as number) > 0) {
            return { ...p, fileSize: fileInfo.size as number };
          }
        }

        return p;
      } catch {
        return p;
      }
    }),
  );
}

export async function deletePhotos(photoIds: string[]): Promise<boolean> {
  if (photoIds.length === 0) return true;
  return MediaLibrary.deleteAssetsAsync(photoIds);
}
