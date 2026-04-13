export type ImageVariantExt = 'webp' | 'avif';

/** Имя файла изображения «домик» для кнопки «О лагере» (nav-image-container). Лежит в public/. */
export const NAV_HOME_IMAGE = 'Gemini_Generated_Image_ct40o9ct40o9ct40.png';

type SplitUrl = {
  path: string;
  query: string;
  hash: string;
};

const splitUrl = (url: string): SplitUrl => {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;

  const queryIndex = withoutHash.indexOf('?');
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : '';
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  return { path, query, hash };
};

/**
 * Convert `.../file.jpg?v=1` -> `.../file.webp?v=1`
 * Returns null if the extension isn't recognized.
 */
export const toSiblingImageUrl = (url: string, ext: ImageVariantExt): string | null => {
  const { path, query, hash } = splitUrl(url);
  const lower = path.toLowerCase();
  const supported = lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
  if (!supported) return null;

  const nextPath = path.replace(/\.(jpg|jpeg|png)$/i, `.${ext}`);
  return `${nextPath}${query}${hash}`;
};
