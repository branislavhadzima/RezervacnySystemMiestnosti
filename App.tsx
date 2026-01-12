
import React, { useState, useMemo } from 'react';
import { ROOMS, WORK_HOURS, STEP_MINUTES } from './constants';
import { Reservation, ReservationStatus, ViewMode, UserDetails } from './types';
import { formatTime, formatDate, isWeekend, getNextWorkDay } from './utils';
import { 
  Calendar as CalendarIcon, 
  Users, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  Mail,
  Send,
  ArrowLeft,
  CalendarDays,
  FileText
} from 'lucide-react';

// Email simulation helper
const simulateEmail = async (to: string, subject: string, body: string) => {
  console.log(`%c EMAIL SENT TO: ${to}\nSUBJECT: ${subject}\nBODY: ${body}`, 'background: #2563eb; color: #fff; padding: 5px; border-radius: 4px;');
  return new Promise(resolve => setTimeout(resolve, 800));
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('USER');
  const [navigationMode, setNavigationMode] = useState<'MONTH' | 'DAY'>('MONTH');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    if (isWeekend(d)) d = getNextWorkDay(d);
    return d;
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [adminAuth, setAdminAuth] = useState<Record<string, boolean>>({});
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // User form state
  const [userDetails, setUserDetails] = useState<UserDetails>({ firstName: '', lastName: '', email: '' });
  const [purposeInput, setPurposeInput] = useState('');

  const activeRoom = useMemo(() => ROOMS.find(r => r.id === selectedRoomId) || ROOMS[0], [selectedRoomId]);
  const isAdminAuthenticatedForCurrentRoom = adminAuth[selectedRoomId] || false;

  // Day specific reservations
  const roomReservationsForSelectedDay = useMemo(() => {
    return reservations.filter(res => 
      res.roomId === selectedRoomId && 
      res.startTime.toDateString() === selectedDate.toDateString()
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [reservations, selectedRoomId, selectedDate]);

  // Calendar logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 is Sunday

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = (firstDayOfMonth(year, month) + 6) % 7; // Adjust to start on Monday
    
    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  const getDayOccupancy = (date: Date) => {
    const dayRes = reservations.filter(res => 
      res.roomId === selectedRoomId && 
      res.startTime.toDateString() === date.toDateString()
    );
    
    const confirmedCount = dayRes.filter(r => r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.BLOCKED).length;
    const percentage = Math.min((confirmedCount / (((WORK_HOURS.end - WORK_HOURS.start) * 60) / STEP_MINUTES)) * 100, 100);

    return { confirmedCount, pendingCount: dayRes.filter(r => r.status === ReservationStatus.PENDING).length, percentage };
  };

  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const current = new Date(selectedDate);
    current.setHours(WORK_HOURS.start, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(WORK_HOURS.end, 0, 0, 0);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + STEP_MINUTES * 60000);
      const existingRes = roomReservationsForSelectedDay.find(res => 
        (slotStart >= res.startTime && slotStart < res.endTime) ||
        (slotEnd > res.startTime && slotEnd <= res.endTime)
      );

      slots.push({ 
        start: slotStart, 
        end: slotEnd, 
        reservation: existingRes,
        isPast: slotStart < now 
      });
      current.setTime(current.getTime() + STEP_MINUTES * 60000);
    }
    return slots;
  };

  const handleBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const isInternalBlock = viewMode === 'ADMIN' && isAdminAuthenticatedForCurrentRoom;
    const now = new Date();

    if (!isInternalBlock) {
      if (!userDetails.firstName || !userDetails.lastName || !userDetails.email || !purposeInput) {
        alert("Prosím vyplňte všetky údaje vrátane účelu využitia.");
        return;
      }
      if (selectedSlot.start < now) {
        alert("Rezervácia do minulosti nie je pre bežných užívateľov povolená.");
        return;
      }
    }

    const newRes: Reservation = {
      id: Math.random().toString(36).substr(2, 9),
      roomId: selectedRoomId,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      status: isInternalBlock ? ReservationStatus.BLOCKED : ReservationStatus.PENDING,
      user: !isInternalBlock ? { ...userDetails } : undefined,
      purpose: purposeInput || undefined
    };

    setIsEmailSending(true);
    if (!isInternalBlock) {
      await simulateEmail(
        'branislav.hadzima@uniza.sk',
        `Nová žiadosť o rezerváciu: ${activeRoom.name}`,
        `Užívateľ ${userDetails.firstName} ${userDetails.lastName} (${userDetails.email}) žiada o rezerváciu.\nTermín: ${formatDate(selectedSlot.start)} o ${formatTime(selectedSlot.start)}\nÚčel využitia: ${purposeInput}`
      );
    }

    setReservations(prev => [...prev, newRes]);
    setIsEmailSending(false);
    setIsBookingModalOpen(false);
    setSelectedSlot(null);
    setPurposeInput('');
    
    if (!isInternalBlock) {
      alert("Vaša žiadosť bola odoslaná na schválenie správcovi.");
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const passwords: Record<string, string> = {
      'room-1': 'SpravcaA*',
      'room-2': 'SpravcaB*',
      'room-3': 'SpravcaC*'
    };

    if (passwordInput === passwords[selectedRoomId]) {
      setAdminAuth(prev => ({ ...prev, [selectedRoomId]: true }));
      setViewMode('ADMIN');
      setIsLoginModalOpen(false);
      setPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('Nesprávne heslo pre túto miestnosť.');
    }
  };

  const updateReservationStatus = async (res: Reservation, status: ReservationStatus) => {
    setIsEmailSending(true);
    const statusText = status === ReservationStatus.CONFIRMED ? 'POTVRDENÁ' : 'ZAMIETNUTÁ';
    
    if (res.user?.email) {
      await simulateEmail(
        res.user.email,
        `Status Vašej rezervácie: ${statusText}`,
        `Dobrý deň ${res.user.firstName}, Vaša rezervácia miestnosti ${activeRoom.name} na deň ${formatDate(res.startTime)} o ${formatTime(res.startTime)} (${res.purpose || 'bez účelu'}) bola správcom ${statusText.toLowerCase()}.`
      );
    }

    setReservations(prev => prev.map(r => r.id === res.id ? { ...r, status } : r));
    setIsEmailSending(false);
  };

  const deleteReservation = (id: string) => {
    if (window.confirm("Naozaj chcete odstrániť túto rezerváciu?")) {
      setReservations(prev => prev.filter(res => res.id !== id));
    }
  };

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + offset);
    setCurrentMonth(next);
  };

  const handleSwitchToAdmin = () => {
    if (isAdminAuthenticatedForCurrentRoom) {
      setViewMode('ADMIN');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {isEmailSending && (
        <div className="fixed top-4 right-4 z-[100] bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <Send size={20} className="animate-pulse" />
          <span className="font-bold">Komunikujem so serverom...</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <CalendarIcon size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Zasadacie Miestnosti</h1>
          </div>

          <div className="flex items-center bg-slate-100 rounded-full p-1">
            <button 
              onClick={() => setViewMode('USER')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'USER' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users size={16} />
              <span>Užívateľ</span>
            </button>
            <button 
              onClick={handleSwitchToAdmin}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'ADMIN' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ShieldCheck size={16} />
              <span>Správca</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 space-y-8">
        {/* Room Selection Sidebar/TopBar */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Výber Zasadacej Miestnosti</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ROOMS.map(room => (
              <button
                key={room.id}
                onClick={() => {
                  setSelectedRoomId(room.id);
                  if (viewMode === 'ADMIN' && !adminAuth[room.id]) setViewMode('USER');
                }}
                className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                  selectedRoomId === room.id 
                  ? 'border-blue-500 bg-white shadow-xl scale-[1.02]' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                   <div className={`p-2 rounded-lg ${selectedRoomId === room.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      <CalendarDays size={20} />
                   </div>
                   {adminAuth[room.id] && <div className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">ADMIN</div>}
                </div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">{room.name}</h3>
                <p className="text-sm text-slate-500 mt-1 flex items-center">
                  <ShieldCheck size={14} className="mr-1" /> {room.adminName}
                </p>
                {selectedRoomId === room.id && <div className="absolute top-4 right-4 text-blue-500"><CheckCircle2 size={20} /></div>}
              </button>
            ))}
          </div>
        </section>

        {navigationMode === 'MONTH' ? (
          /* MONTHLY VIEW */
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <CalendarDays size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">
                  {currentMonth.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-1 text-sm font-bold text-slate-600 hover:text-blue-600">Dnes</button>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors"><ChevronRight size={20} /></button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 sm:gap-4">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/30 rounded-2xl" />;
                  
                  const weekend = isWeekend(date);
                  const occupancy = getDayOccupancy(date);
                  const isToday = date.toDateString() === new Date().toDateString();

                  return (
                    <button
                      key={idx}
                      disabled={weekend}
                      onClick={() => {
                        setSelectedDate(date);
                        setNavigationMode('DAY');
                      }}
                      className={`relative aspect-square rounded-2xl p-2 sm:p-3 border transition-all flex flex-col justify-between group overflow-hidden ${
                        weekend 
                          ? 'bg-slate-50 border-transparent opacity-40 cursor-not-allowed' 
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1'
                      } ${isToday ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    >
                      <div className="flex justify-between items-start z-10">
                        <span className={`text-base sm:text-lg font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                          {date.getDate()}
                        </span>
                        {!weekend && occupancy.pendingCount > 0 && (
                          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>

                      {!weekend && (
                        <div className="space-y-1 z-10">
                          {occupancy.confirmedCount > 0 && (
                             <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                               {occupancy.confirmedCount} obsadené
                             </div>
                          )}
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${
                                occupancy.percentage > 80 ? 'bg-rose-500' : 
                                occupancy.percentage > 40 ? 'bg-amber-500' : 
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${occupancy.percentage}%` }} 
                            />
                          </div>
                        </div>
                      )}

                      {isToday && <span className="absolute bottom-1 right-2 text-[8px] font-black text-blue-500 uppercase tracking-tighter">Dnes</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
               <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /> Voľné / Málo obsadené</div>
               <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2" /> Čiastočne obsadené</div>
               <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2" /> Vysoká obsadenosť</div>
               <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-slate-300 mr-2" /> Víkend (Zatvorené)</div>
            </div>
          </section>
        ) : (
          /* DAILY VIEW (DRILL-DOWN) */
          <section className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6 flex items-center justify-between">
              <button 
                onClick={() => setNavigationMode('MONTH')}
                className="flex items-center space-x-2 text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
              >
                <ArrowLeft size={20} />
                <span>Späť na mesačný prehľad</span>
              </button>
              <div className="text-right">
                <h3 className="text-xl font-black text-slate-800">{formatDate(selectedDate)}</h3>
                <p className="text-sm text-slate-500">{activeRoom.name}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Clock size={20} className="text-blue-400" />
                  <span className="font-bold">Rozpis termínov (06:00 - 20:00)</span>
                </div>
                {viewMode === 'ADMIN' && (
                  <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Administrácia: {activeRoom.adminName}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                {generateTimeSlots().map((slot, idx) => (
                  <div key={idx} className={`flex hover:bg-slate-50/50 transition-colors ${slot.isPast && viewMode === 'USER' && !slot.reservation ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <div className="w-24 p-4 text-sm font-bold text-slate-400 border-r border-slate-100 flex-shrink-0 flex items-center justify-center">
                      {formatTime(slot.start)}
                    </div>
                    <div className="flex-1 p-2">
                      {slot.reservation ? (
                        <div className={`w-full p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
                          slot.reservation.status === ReservationStatus.BLOCKED ? 'bg-slate-100 border-slate-200 text-slate-500' :
                          slot.reservation.status === ReservationStatus.PENDING ? 'bg-amber-50 border-amber-200 text-amber-800' :
                          slot.reservation.status === ReservationStatus.CONFIRMED ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                          'bg-rose-50 border-rose-200 text-rose-800'
                        }`}>
                          <div className="flex items-center space-x-4 overflow-hidden">
                            <div className="p-2 bg-white/60 rounded-xl shadow-sm">
                              {slot.reservation.status === ReservationStatus.BLOCKED ? <ShieldCheck size={20} /> : <Users size={20} />}
                            </div>
                            <div className="truncate">
                              <p className="font-black text-sm uppercase tracking-tight">
                                {slot.reservation.status === ReservationStatus.BLOCKED 
                                  ? 'Blokované' 
                                  : `${slot.reservation.user?.firstName} ${slot.reservation.user?.lastName}`}
                              </p>
                              <p className="text-xs opacity-70 truncate font-medium">
                                 {slot.reservation.status === ReservationStatus.BLOCKED 
                                    ? 'Vstavaná správa miestnosti' 
                                    : `${slot.reservation.user?.email}${slot.reservation.purpose ? ` • ${slot.reservation.purpose}` : ''}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            {viewMode === 'ADMIN' && isAdminAuthenticatedForCurrentRoom ? (
                              <>
                                {slot.reservation.status === ReservationStatus.PENDING && (
                                  <>
                                    <button 
                                      onClick={() => updateReservationStatus(slot.reservation!, ReservationStatus.CONFIRMED)}
                                      className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-sm"
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <button 
                                      onClick={() => updateReservationStatus(slot.reservation!, ReservationStatus.REJECTED)}
                                      className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all shadow-sm"
                                    >
                                      <XCircle size={18} />
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={() => deleteReservation(slot.reservation!.id)}
                                  className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all ml-2"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            ) : (
                              <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current opacity-60">
                                {slot.reservation.status === ReservationStatus.PENDING ? 'Čaká' : 
                                 slot.reservation.status === ReservationStatus.CONFIRMED ? 'Zadané' : 'Nedostupné'}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedSlot({ start: slot.start, end: slot.end });
                            setIsBookingModalOpen(true);
                          }}
                          className={`w-full h-14 border-2 border-dashed rounded-2xl flex items-center justify-center transition-all group ${
                            slot.isPast && viewMode === 'ADMIN' 
                            ? 'border-indigo-200 bg-indigo-50/30 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600'
                            : 'border-slate-200 text-slate-400 hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-600'
                          }`}
                        >
                          <Plus size={24} className="mr-2 group-hover:rotate-90 transition-transform" />
                          <span className="text-sm font-bold">
                            {slot.isPast && viewMode === 'ADMIN' ? `Záznam do minulosti (${formatTime(slot.start)})` : `Rezervovať slot ${formatTime(slot.start)}`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 text-white text-center">
              <div className="mx-auto w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-black">Prístup Správcu</h3>
              <p className="text-slate-400 text-xs mt-1">Miestnosť: {activeRoom.name}</p>
            </div>
            
            <form onSubmit={handleAdminAuth} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Heslo</label>
                <input 
                  autoFocus
                  required
                  type="password" 
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono"
                  placeholder="••••••••"
                />
                {loginError && <p className="text-rose-500 text-xs font-bold">{loginError}</p>}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                >
                  PRIHLÁSIŤ SA
                </button>
                <button 
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 text-sm"
                >
                  Zrušiť
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <CalendarIcon size={24} />
                <h3 className="text-xl font-black">{viewMode === 'ADMIN' ? 'SPRÁVA MIESTNOSTI' : 'NOVÁ REZERVÁCIA'}</h3>
              </div>
              <button onClick={() => setIsBookingModalOpen(false)} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
                <XCircle size={28} />
              </button>
            </div>
            
            <form onSubmit={handleBookingRequest} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Miestnosť</p>
                   <p className="font-bold text-slate-800 truncate">{activeRoom.name}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Termín</p>
                   <p className="font-bold text-slate-800">{formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}</p>
                </div>
              </div>

              {viewMode === 'USER' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meno</label>
                      <input 
                        required
                        type="text" 
                        value={userDetails.firstName}
                        onChange={e => setUserDetails({...userDetails, firstName: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none"
                        placeholder="Jozef"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priezvisko</label>
                      <input 
                        required
                        type="text" 
                        value={userDetails.lastName}
                        onChange={e => setUserDetails({...userDetails, lastName: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none"
                        placeholder="Novák"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        required
                        type="email" 
                        value={userDetails.email}
                        onChange={e => setUserDetails({...userDetails, email: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none"
                        placeholder="jozef.novak@uniza.sk"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Účel využitia miestnosti</label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-3.5 text-slate-400" />
                      <textarea 
                        required
                        value={purposeInput}
                        onChange={e => setPurposeInput(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none min-h-[80px]"
                        placeholder="Popíšte účel stretnutia..."
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3 text-xs text-amber-800 leading-relaxed font-medium">
                    <Info size={18} className="mt-0.5 flex-shrink-0" />
                    <p>Odoslaním požiadate o schválenie. Notifikácia bude zaslaná na Váš email a taktiež na branislav.hadzima@uniza.sk.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-800">
                    <p className="font-bold mb-1">Administrátorský záznam</p>
                    <p className="text-sm">Vytvárate záznam o využití miestnosti. Môžete zadať účel pre prehľadnosť.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Poznámka / Účel (voliteľné)</label>
                    <textarea 
                      value={purposeInput}
                      onChange={e => setPurposeInput(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none min-h-[80px]"
                      placeholder="Interné školenie, servis..."
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsBookingModalOpen(false);
                    setPurposeInput('');
                  }}
                  className="flex-1 py-4 font-black text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Zrušiť
                </button>
                <button 
                  disabled={isEmailSending}
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isEmailSending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{viewMode === 'ADMIN' ? 'POTVRDIŤ ZÁZNAM' : 'ODOSLAŤ REZERVÁCIU'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-8 text-center">
         <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Rezervačný Systém Uniza</p>
         <p className="text-sm font-bold text-slate-500 italic">"Správa priestorov efektívne a jednoducho."</p>
      </footer>
    </div>
  );
};

export default App;
