
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('sk-SK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const getNextWorkDay = (date: Date): Date => {
  let next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (isWeekend(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};
