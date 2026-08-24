/**
 * Delivery optimization for Cloudinary-hosted images.
 *
 * Admins may upload files up to 10 MB; injecting Cloudinary on-the-fly
 * transformations (`f_auto,q_auto,c_limit,w_<width>`) lets the CDN serve a
 * right-sized, auto-formatted variant so visitors never download the
 * original. Non-Cloudinary URLs are returned unchanged.
 *
 * `c_limit` never upscales, so small originals stay untouched.
 */
export function optimizeImageUrl(
  url: string | undefined | null,
  width?: number
): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  const transformations = ['f_auto', 'q_auto'];
  if (width && width > 0) transformations.push(`c_limit,w_${width}`);
  return url.replace('/upload/', `/upload/${transformations.join(',')}/`);
}
