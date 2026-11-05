export type ContentDateFilter = {
  type: 'date' | 'month' | 'year' | 'user';
  value: string;
};

const parseContentDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const matchesContentDateFilter = (
  createdAt: string | null | undefined,
  filter: ContentDateFilter
): boolean => {
  const date = parseContentDate(createdAt);
  if (!date) return false;

  if (filter.type === 'date') {
    const [year, month, day] = filter.value.split('-').map(Number);
    return (
      date.getFullYear() === year &&
      date.getMonth() + 1 === month &&
      date.getDate() === day
    );
  }

  if (filter.type === 'month') {
    return date.getMonth() === Number(filter.value);
  }

  if (filter.type === 'user') return false;
  return date.getFullYear() === Number(filter.value);
};
