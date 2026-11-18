// The two update decisions, apart from the plugins so they can be tested.

/** Is `published` a newer APK than the installed build? */
export function newerApk(published, installedBuild) {
  return Boolean(published && Number(published.versionCode) > Number(installedBuild || 0));
}

/**
 * Should this over-the-air manifest be installed? As in Easy Pedia, the
 * manifest says the oldest APK build it runs on (minNativeBuild, set by CI to
 * the build where the native side last changed). An APK with that build or a
 * newer one takes the bundle; an older one needs the new APK first. Manifests
 * without it fall back to the native fingerprint.
 */
export function bundleFits(manifest, { running, nativeHash, build }) {
  if (!manifest?.version || !manifest?.url) return 'none';
  if (manifest.version === running) return 'current';
  if (nativeHash && manifest.nativeHash === nativeHash) return 'install';
  const min = Number(manifest.minNativeBuild);
  if (min > 0 && Number(build) > 0) return Number(build) >= min ? 'install' : 'needs-apk';
  return 'needs-apk';
}
