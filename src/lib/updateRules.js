// The two update decisions, apart from the plugins so they can be tested.

/** Is `published` a newer APK than the installed build? */
export function newerApk(published, installedBuild) {
  return Boolean(published && Number(published.versionCode) > Number(installedBuild || 0));
}

/** Should this over-the-air manifest be installed? */
export function bundleFits(manifest, { running, nativeHash }) {
  if (!manifest?.version || !manifest?.url) return 'none';
  if (manifest.version === running) return 'current';
  if (!nativeHash || manifest.nativeHash !== nativeHash) return 'needs-apk';
  return 'install';
}

