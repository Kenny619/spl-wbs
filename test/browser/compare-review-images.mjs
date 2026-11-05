import { PNG } from 'pngjs';

// Keep the existing approved maximum different-pixel ratio. Unlike Playwright's
// perceptual comparator, count every differing RGBA pixel (a stricter color test).
export const MAX_DIFF_PIXEL_RATIO = 0.001;
export function compareReviewImages(expectedBuffer, actualBuffer) {
  const expected = PNG.sync.read(expectedBuffer);
  const actual = PNG.sync.read(actualBuffer);
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return { matches: false, dimensionsMatch: false, ratio: 1, differentPixels: null, diff: null };
  }
  const diff = new PNG({ width: expected.width, height: expected.height });
  let differentPixels = 0;
  for (let offset = 0; offset < expected.data.length; offset += 4) {
    const changed = [0,1,2,3].some(channel => expected.data[offset+channel] !== actual.data[offset+channel]);
    if (changed) differentPixels += 1;
    diff.data[offset] = changed ? 255 : Math.round(expected.data[offset]*0.2+204);
    diff.data[offset+1] = changed ? 0 : Math.round(expected.data[offset+1]*0.2+204);
    diff.data[offset+2] = changed ? 0 : Math.round(expected.data[offset+2]*0.2+204);
    diff.data[offset+3] = 255;
  }
  const ratio = differentPixels / (expected.width * expected.height);
  return { matches: ratio <= MAX_DIFF_PIXEL_RATIO, dimensionsMatch: true, ratio, differentPixels, diff: PNG.sync.write(diff) };
}
