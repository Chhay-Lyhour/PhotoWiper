import * as MediaLibrary from 'expo-media-library';
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
 * getAssetInfoAsync(id) does. Use this to backfill sizes for photos that
 * still have fileSize === undefined (typically the next few in the queue).
 *
 * Runs all lookups in parallel. Any individual failure leaves that photo's
 * fileSize untouched (caller's responsibility to handle undefined).
 */
export async function enrichWithFileSize(photos: Photo[]): Promise<Photo[]> {
  return Promise.all(
    photos.map(async (p) => {
      if (p.fileSize !== undefined) return p;
      try {
        const info = await MediaLibrary.getAssetInfoAsync(p.id);
        // fileSize is reported in bytes on both iOS and Android by expo-media-library
        const size = (info as { fileSize?: number }).fileSize;
        return size !== undefined ? { ...p, fileSize: size } : p;
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
