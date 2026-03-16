function getClassMods(baseClass, mods) {
  if (!mods) {
    return '';
  }

  if (!Array.isArray(mods)) {
    mods = String(mods).split(' ').filter(Boolean);
  }

  return mods.map((mod) => `${baseClass}--${mod}`).join(' ');
}

export { getClassMods };
