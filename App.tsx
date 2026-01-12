
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
  Send
} from 'lucide-react';

// Email simulation helper
const simulateEmail = async (to: string, subject: string, body: string) => {
  console.log(`%c EMAIL SENT TO: ${to}\nSUBJECT: ${subject}\nBODY: ${body}`, 'background: #2563eb; color: #fff; padding: 5px; border-radius: 4px;');
  // In a real app, this would call a backend API or a service like EmailJS
  return new Promise(resolve => setTimeout(resolve, 1000));
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('USER');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    if (isWeekend(d)) d = getNextWorkDay(d);
    return d;
  });
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

  const activeRoom = useMemo(() => ROOMS.find(r => r.id === selectedRoomId) || ROOMS[0], [selectedRoomId]);

  const isAdminAuthenticatedForCurrentRoom = adminAuth[selectedRoomId] || false;

  const roomReservations = useMemo(() => {
    return reservations.filter(res => 
      res.roomId === selectedRoomId && 
      res.startTime.toDateString() === selectedDate.toDateString()
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [reservations, selectedRoomId, selectedDate]);

  const generateTimeSlots = () => {
    const slots = [];
    const current = new Date(selectedDate);
    current.setHours(WORK_HOURS.start, 0, 0, 0);
    
    const end = new Date(selectedDate);
    end.setHours(WORK_HOURS.end, 0, 0, 0);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + STEP_MINUTES * 60000);
      
      const existingRes = roomReservations.find(res => 
        (slotStart >= res.startTime && slotStart < res.endTime) ||
        (slotEnd > res.startTime && slotEnd <= res.endTime)
      );

      slots.push({
        start: slotStart,
        end: slotEnd,
        reservation: existingRes
      });

      current.setTime(current.getTime() + STEP_MINUTES * 60000);
    }
    return slots;
  };

  const handleBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const isInternalBlock = viewMode === 'ADMIN' && isAdminAuthenticatedForCurrentRoom;

    if (!isInternalBlock && (!userDetails.firstName || !userDetails.lastName || !userDetails.email)) {
      alert("Prosím vyplňte všetky údaje.");
      return;
    }

    const newRes: Reservation = {
      id: Math.random().toString(36).substr(2, 9),
      roomId: selectedRoomId,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      status: isInternalBlock ? ReservationStatus.BLOCKED : ReservationStatus.PENDING,
      user: !isInternalBlock ? { ...userDetails } : undefined
    };

    setIsEmailSending(true);
    if (!isInternalBlock) {
      await simulateEmail(
        'branislav.hadzima@uniza.sk',
        `Nová žiadosť o rezerváciu: ${activeRoom.name}`,
        `Užívateľ ${userDetails.firstName} ${userDetails.lastName} (${userDetails.email}) žiada o rezerváciu na ${formatDate(selectedSlot.start)} o ${formatTime(selectedSlot.start)}.`
      );
    }

    setReservations(prev => [...prev, newRes]);
    setIsEmailSending(false);
    setIsBookingModalOpen(false);
    setSelectedSlot(null);
    
    if (!isInternalBlock) {
      alert("Vaša žiadosť bola odoslaná na schválenie správcovi a emailová notifikácia bola zaslaná.");
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
        `Dobrý deň ${res.user.firstName}, Vaša rezervácia miestnosti ${activeRoom.name} na deň ${formatDate(res.startTime)} o ${formatTime(res.startTime)} bola správcom ${statusText.toLowerCase()}.`
      );
    }

    setReservations(prev => prev.map(r => r.id === res.id ? { ...r, status } : r));
    setIsEmailSending(false);
  };

  const deleteReservation = (id: string) => {
    if (window.confirm("Naozaj chcete odstrániť túto rezerváciu/blok?")) {
      setReservations(prev => prev.filter(res => res.id !== id));
    }
  };

  const changeDate = (days: number) => {
    let next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    while (isWeekend(next)) {
      next.setDate(next.getDate() + (days > 0 ? 1 : -1));
    }
    setSelectedDate(next);
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
      {/* Email Sending Indicator */}
      {isEmailSending && (
        <div className="fixed top-4 right-4 z-[100] bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <Send size={20} className="animate-pulse" />
          <span className="font-bold">Odosielam email...</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <CalendarIcon size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Rezervačný Portál</h1>
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
        {/* Selection Area */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Výber miestnosti</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ROOMS.map(room => (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    if (viewMode === 'ADMIN' && !adminAuth[room.id]) {
                      setViewMode('USER');
                    }
                  }}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left group ${
                    selectedRoomId === room.id 
                    ? 'border-blue-500 bg-blue-50/50 shadow-md' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-medium mb-1 ${selectedRoomId === room.id ? 'text-blue-600' : 'text-slate-500'}`}>
                      {room.adminName}
                    </p>
                    {adminAuth[room.id] && <ShieldCheck size={14} className="text-emerald-500" title="Prihlásený ako správca" />}
                  </div>
                  <h3 className="font-bold text-slate-800">{room.name}</h3>
                  {selectedRoomId === room.id && (
                    <div className="absolute top-2 right-2 text-blue-600">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Dátum</h2>
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <p className="font-bold text-slate-800">{formatDate(selectedDate)}</p>
                <p className="text-xs text-slate-500">Pracovný deň</p>
              </div>
              <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </section>

        {/* Calendar View */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center space-x-2 text-slate-700">
              <Clock size={20} />
              <span className="font-semibold">{activeRoom.name} - Rozpis dňa</span>
            </div>
            {viewMode === 'ADMIN' && (
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">REŽIM SPRÁVCU: {activeRoom.adminName}</span>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {generateTimeSlots().map((slot, idx) => (
              <div key={idx} className="flex hover:bg-slate-50 transition-colors group">
                <div className="w-24 p-4 text-sm font-medium text-slate-400 border-r border-slate-100 flex-shrink-0">
                  {formatTime(slot.start)}
                </div>
                <div className="flex-1 p-2 flex items-center">
                  {slot.reservation ? (
                    <div className={`w-full p-3 rounded-lg border flex items-center justify-between shadow-sm transition-all ${
                      slot.reservation.status === ReservationStatus.BLOCKED ? 'bg-slate-100 border-slate-200 text-slate-500' :
                      slot.reservation.status === ReservationStatus.PENDING ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      slot.reservation.status === ReservationStatus.CONFIRMED ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                      'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {slot.reservation.status === ReservationStatus.BLOCKED ? (
                          <div className="p-1.5 bg-slate-200 rounded-md"><ShieldCheck size={16} /></div>
                        ) : (
                          <div className="p-1.5 bg-white/50 rounded-md"><Users size={16} /></div>
                        )}
                        <div className="truncate">
                          <p className="font-bold text-sm">
                            {slot.reservation.status === ReservationStatus.BLOCKED 
                              ? 'Blokované správcom' 
                              : `${slot.reservation.user?.firstName} ${slot.reservation.user?.lastName}`}
                          </p>
                          <p className="text-xs opacity-75 truncate">
                             {slot.reservation.status === ReservationStatus.BLOCKED ? 'Miestnosť nie je k dispozícii' : slot.reservation.user?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {viewMode === 'ADMIN' && isAdminAuthenticatedForCurrentRoom ? (
                          <>
                            {slot.reservation.status === ReservationStatus.PENDING && (
                              <>
                                <button 
                                  disabled={isEmailSending}
                                  onClick={() => updateReservationStatus(slot.reservation!, ReservationStatus.CONFIRMED)}
                                  className="p-1.5 hover:bg-emerald-200 rounded-lg text-emerald-600 transition-colors disabled:opacity-50"
                                  title="Potvrdiť (odošle email užívateľovi)"
                                >
                                  <CheckCircle2 size={20} />
                                </button>
                                <button 
                                  disabled={isEmailSending}
                                  onClick={() => updateReservationStatus(slot.reservation!, ReservationStatus.REJECTED)}
                                  className="p-1.5 hover:bg-rose-200 rounded-lg text-rose-600 transition-colors disabled:opacity-50"
                                  title="Odmietnuť (odošle email užívateľovi)"
                                >
                                  <XCircle size={20} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => deleteReservation(slot.reservation!.id)}
                              className="p-1.5 hover:bg-slate-300 rounded-lg text-slate-600 transition-colors ml-2"
                              title="Zmazať"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-white/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {slot.reservation.status === ReservationStatus.PENDING && <span className="text-amber-600">Čaká na schválenie</span>}
                            {slot.reservation.status === ReservationStatus.CONFIRMED && <span className="text-emerald-600">Rezervované</span>}
                            {slot.reservation.status === ReservationStatus.BLOCKED && <span className="text-slate-500">Nedostupné</span>}
                            {slot.reservation.status === ReservationStatus.REJECTED && <span className="text-rose-600">Zamietnuté</span>}
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
                      className="w-full h-12 border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center text-slate-300 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-400 transition-all"
                    >
                      <Plus size={20} className="mr-1" />
                      <span className="text-sm font-medium">Kliknite pre rezerváciu ({formatTime(slot.start)})</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 justify-center">
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 mr-2"></div> Schválené</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 mr-2"></div> Čakajúce</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300 mr-2"></div> Blokované (Správca)</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300 mr-2"></div> Zamietnuté</div>
        </div>
      </main>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center">
                <Lock className="mr-2" size={20} />
                Prístup správcu
              </h3>
              <button onClick={() => setIsLoginModalOpen(false)} className="hover:bg-slate-700 p-1 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAdminAuth} className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-600">Zadajte heslo pre správu miestnosti:</p>
                <p className="font-bold text-slate-800">{activeRoom.name}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Heslo</label>
                <input 
                  autoFocus
                  required
                  type="password" 
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                {loginError && <p className="text-rose-500 text-xs mt-1 font-medium">{loginError}</p>}
              </div>

              <button 
                type="submit"
                className="w-full py-3 px-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg"
              >
                Prihlásiť sa
              </button>
              
              <p className="text-[10px] text-center text-slate-400">
                Tip: Každá miestnosť má vlastné heslo v tvare Spravca[Písmeno]*
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center">
                <CalendarIcon className="mr-2" size={20} />
                {viewMode === 'ADMIN' ? 'Zablokovať čas' : 'Nová rezervácia'}
              </h3>
              <button onClick={() => setIsBookingModalOpen(false)} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleBookingRequest} className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl flex items-start space-x-3 mb-4">
                <Info size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-800 font-bold">{activeRoom.name}</p>
                  <p className="text-blue-600 font-medium">{formatDate(selectedSlot.start)}</p>
                  <p className="text-blue-600">{formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}</p>
                </div>
              </div>

              {viewMode === 'USER' ? (
                <>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meno</label>
                        <input 
                          required
                          type="text" 
                          value={userDetails.firstName}
                          onChange={e => setUserDetails({...userDetails, firstName: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          placeholder="napr. Jozef"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priezvisko</label>
                        <input 
                          required
                          type="text" 
                          value={userDetails.lastName}
                          onChange={e => setUserDetails({...userDetails, lastName: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          placeholder="napr. Novák"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Emailová adresa</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input 
                          required
                          type="email" 
                          value={userDetails.email}
                          onChange={e => setUserDetails({...userDetails, email: e.target.value})}
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          placeholder="jozef.novak@firma.sk"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center space-x-2 mt-4">
                    <Mail size={16} className="text-amber-600" />
                    <p className="text-[10px] text-amber-800 leading-tight">
                      Požiadavka bude zaslaná na <strong>branislav.hadzima@uniza.sk</strong>. O výsledku budete informovaní na Váš email.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-4">
                  <p className="text-slate-600 text-sm">
                    Tento blok času bude označený ako <strong>Nedostupný</strong> pre bežných užívateľov.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Zrušiť
                </button>
                <button 
                  disabled={isEmailSending}
                  type="submit"
                  className="flex-[2] py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isEmailSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (viewMode === 'ADMIN' ? 'Zablokovať čas' : 'Odoslať žiadosť')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Rezervačný systém zasadacích miestností. Pracovná doba 06:00 - 20:00.</p>
      </footer>
    </div>
  );
};

export default App;
