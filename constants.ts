
import { Room } from './types';

export const ROOMS: Room[] = [
  { id: 'room-1', name: 'Zasadacia miestnosť A (Alfa)', adminName: 'Peter Správca', color: 'blue' },
  { id: 'room-2', name: 'Zasadacia miestnosť B (Beta)', adminName: 'Mária Správkyňa', color: 'emerald' },
  { id: 'room-3', name: 'Zasadacia miestnosť C (Gama)', adminName: 'Ján Vedúci', color: 'indigo' },
];

export const WORK_HOURS = {
  start: 6,
  end: 20,
};

export const STEP_MINUTES = 30;
