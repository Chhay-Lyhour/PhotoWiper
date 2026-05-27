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

export async function deletePhotos(photoIds: string[]): Promise<boolean> {
  if (photoIds.length === 0) return true;
  return MediaLibrary.deleteAssetsAsync(photoIds);
}
