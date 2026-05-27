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
        // shouldDownloadFromNetwork:false avoids a native crash on iOS when
        // iCloud-only photos would otherwise be fetched from the network.
        const info = await MediaLibrary.getAssetInfoAsync(p.id, {
          shouldDownloadFromNetwork: false,
        }) as MediaLibrary.AssetInfo & { fileSize?: number };

        // DEBUG — remove once size display is verified working on device
        console.log('[enrichSize]', p.id.slice(0, 8), {
          mlFileSize: info.fileSize,
          hasLocalUri: !!info.localUri,
          origUri: p.uri.slice(0, 24),
        });

        // Primary: fileSize from MediaLibrary (bytes, available when asset is local)
        if (info.fileSize != null && info.fileSize > 0) {
          return { ...p, fileSize: info.fileSize };
        }

        // Fallback: measure the local file directly via FileSystem.
        // IMPORTANT: only attempt this for file:// URIs. ph:// is iOS PhotoKit
        // and FileSystem can't handle it — passing one can trigger a native
        // exception that crashes the app on iOS.
        const uri = info.localUri ?? p.uri;
        if (uri && uri.startsWith('file://')) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(uri);
            const size = (fileInfo as { size?: number }).size;
            console.log('[enrichSize fallback]', p.id.slice(0, 8), { exists: fileInfo.exists, size });
            if (fileInfo.exists && size != null && size > 0) {
              return { ...p, fileSize: size };
            }
          } catch (fsErr) {
            console.warn('[enrichSize FS error]', p.id.slice(0, 8), (fsErr as Error).message);
          }
        }

        return p;
      } catch (err) {
        console.warn('[enrichSize ML error]', p.id.slice(0, 8), (err as Error).message);
        return p;
      }
    }),
  );
}

export async function deletePhotos(photoIds: string[]): Promise<boolean> {
  if (photoIds.length === 0) return true;
  return MediaLibrary.deleteAssetsAsync(photoIds);
}
