const modulePath = /^([a-f0-9-]{36})\/[a-f0-9]{64}\.mp4$/;
const foundationPath = /^shared\/foundation-v[1-9][0-9]*-m0[1-8]\/[a-f0-9]{64}\.mp4$/;

/**
 * @param {string} moduleId
 * @param {unknown} objectPath
 */
export function validModuleMediaPath(moduleId, objectPath) {
  if (typeof objectPath !== 'string' || objectPath !== objectPath.trim()) return false;
  return modulePath.exec(objectPath)?.[1] === moduleId || foundationPath.test(objectPath);
}
