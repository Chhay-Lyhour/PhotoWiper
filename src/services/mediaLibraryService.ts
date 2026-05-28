import * as MediaLibrary from 'expo-media-library';
import type { Photo } from '../types';

const PAGE_SIZE = 200;

// Rough byte-per-pixel coefficient for camera photos. iOS PhotoKit omits
// fileSize from the bulk listing, so we estimate from dimensions to keep the
// UI/stats meaningful instead of showing "unknown". Android usually returns a
// real number and skips this path.
const BYTES_PER_PIXEL_ESTIMATE = 0.30;

export function estimateFileSize(width?: number, height?: number): number | undefined {
  if (!width || !height) return undefined;
  return Math.round(width * height * BYTES_PER_PIXEL_ESTIMATE);
}

function toPhoto(asset: MediaLibrary.Asset): Photo {
  const real = (asset as MediaLibrary.Asset & { fileSize?: number }).fileSize;
  const fileSize = real && real > 0 ? real : estimateFileSize(asset.width, asset.height);
  return {
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename,
    width: asset.width,
    height: asset.height,
    creationTime: asset.creationTime,
    modificationTime: asset.modificationTime,
    mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
    fileSize,
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
