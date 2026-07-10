import { create } from 'zustand';
import type { Booking, Station } from '../types';

interface BookingState {
  selectedStation: Station | null;
  activeBooking: Booking | null;
  setSelectedStation: (station: Station | null) => void;
  setActiveBooking: (booking: Booking | null) => void;
  clearBookingState: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedStation: null,
  activeBooking: null,
  setSelectedStation: (station) => set({ selectedStation: station }),
  setActiveBooking: (booking) => set({ activeBooking: booking }),
  clearBookingState: () => set({ selectedStation: null, activeBooking: null }),
}));
