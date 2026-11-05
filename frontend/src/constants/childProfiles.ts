export const CHILD_AVATARS = [
  '🚀', '🦁', '🎨', '⚽', '🦄', '🐼', '🎸', '🦖',
  '🐱', '🐶', '🦊', '🐻', '🐯', '🐸', '🐧', '🐬',
];

export const CHILD_AVATAR_COLORS = [
  0xff3a9be8, // Blue
  0xffffb703, // Dark Yellow
  0xffec4899, // Pink
  0xff8b5cf6, // Purple
];

export const CHILD_AGE_BANDS = [
  { label: '2 to 4', ageGroup: 3, minAge: 2, maxAge: 4 },
  { label: '5 to 7', ageGroup: 6, minAge: 5, maxAge: 7 },
  { label: '8 to 12', ageGroup: 10, minAge: 8, maxAge: 12 },
] as const;

export const getChildAgeBandLabel = (rawAge?: any): string => {
  if (rawAge === null || rawAge === undefined || rawAge === '') {
    return 'Ages 5 to 7';
  }
  const age = Number(rawAge);
  if (Number.isFinite(age) && age > 0) {
    const match = CHILD_AGE_BANDS.find(
      (band) =>
        band.ageGroup === age ||
        (age >= band.minAge && age <= band.maxAge)
    );
    if (match) return `Ages ${match.label}`;
    if (age <= 4) return 'Ages 2 to 4';
    if (age >= 8) return 'Ages 8 to 12';
    return `Age ${age}`;
  }
  if (typeof rawAge === 'string' && rawAge.trim().length > 0) {
    if (rawAge.toLowerCase().includes('age')) return rawAge;
    return `Ages ${rawAge}`;
  }
  return 'Ages 5 to 7';
};
