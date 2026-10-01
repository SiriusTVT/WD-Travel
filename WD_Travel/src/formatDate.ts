export const formatDisplayDate = (value: string): string => {
  const dateParts = value.split('-');
  if (dateParts.length !== 3) return value;

  const [year, month, day] = dateParts;
  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
};