import React, { useMemo } from 'react';
import { Image, ImageProps } from 'expo-image';
import { resolveMediaUrl } from '@/services/api';

/**
 * `expo-image` with the media host corrected.
 *
 * Every screen uses this instead of importing `Image` directly, so a stored
 * URL that points at the wrong host — most often `localhost`, which on a
 * phone means the phone itself — still resolves to the running API.
 */
export function AppImage(props: ImageProps) {
  const source = useMemo(() => {
    const src: any = props.source;
    if (!src) return src;

    if (typeof src === 'string') return { uri: resolveMediaUrl(src) };

    // A bundled asset (require(...)) is a number — pass it straight through.
    if (typeof src === 'number') return src;

    if (Array.isArray(src)) {
      return src.map((s: any) =>
        s && typeof s === 'object' && 'uri' in s ? { ...s, uri: resolveMediaUrl(s.uri) } : s,
      );
    }

    if (typeof src === 'object' && 'uri' in src) {
      return { ...src, uri: resolveMediaUrl(src.uri) };
    }

    return src;
  }, [props.source]);

  return <Image {...props} source={source} />;
}
