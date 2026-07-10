export function avatarColorFromSeed(seed: string): string {
  const palette = ['#2E8BEA', '#EF4444', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = seed.charCodeAt(i) + ((h << 5) - h);
  }
  return palette[Math.abs(h) % palette.length]!;
}
