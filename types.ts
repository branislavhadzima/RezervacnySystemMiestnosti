
export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED' // Admin block
}

export interface UserDetails {
  firstName: string;
  lastName: string;
  email: string;
}

export interface Reservation {
  id: string;
  roomId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  user?: UserDetails;
  note?: string;
}

export interface Room {
  id: string;
  name: string;
  adminName: string;
  color: string;
}

export type ViewMode = 'USER' | 'ADMIN';
