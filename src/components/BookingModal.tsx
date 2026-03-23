import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from '../firebase';

interface BookingModalProps {
  service: {
    id: string;
    title: string;
    price: string;
    providerId: string;
    providerName: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "14:00", "15:00", "16:00", "17:00", "18:00"
];

export default function BookingModal({ service, onClose, onSuccess }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [message, setMessage] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Fetch booked slots for the selected date
  useEffect(() => {
    if (!selectedDate) return;

    const q = query(
      collection(db, 'bookings'),
      where('providerId', '==', service.providerId),
      where('date', '==', selectedDate),
      where('status', 'in', ['pending', 'accepted'])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const slots = snapshot.docs.map(doc => doc.data().time);
      setBookedSlots(slots);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsub();
  }, [selectedDate, service.providerId]);

  const handleConfirm = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        clientId: auth.currentUser.uid,
        providerId: service.providerId,
        serviceId: service.id,
        serviceTitle: service.title,
        servicePrice: service.price,
        date: selectedDate,
        time: selectedTime,
        message,
        address,
        phone,
        status: "pending",
        createdAt: serverTimestamp()
      });
      onSuccess();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'bookings');
    } finally {
      setLoading(false);
    }
  };

  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-md bg-white rounded-t-[3px] sm:rounded-[3px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Reservar Serviço</h2>
            <p className="text-xs text-zinc-500">{service.title} • {service.price}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Selecione o Dia
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {getNext7Days().map(date => {
                    const d = new Date(date + 'T00:00:00');
                    const isSelected = selectedDate === date;
                    return (
                      <button 
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center min-w-[64px] p-3 rounded-[3px] border transition-all ${isSelected ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg scale-105' : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300'}`}
                      >
                        <span className="text-[10px] uppercase font-bold opacity-60">
                          {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                        </span>
                        <span className="text-lg font-bold">{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDate && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Horários Disponíveis
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {TIME_SLOTS.map(time => {
                      const isBooked = bookedSlots.includes(time);
                      const isSelected = selectedTime === time;
                      return (
                        <button 
                          key={time}
                          disabled={isBooked}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-1 rounded-[3px] text-xs font-bold border transition-all ${isBooked ? 'bg-zinc-50 border-zinc-50 text-zinc-300 cursor-not-allowed' : isSelected ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-700 hover:border-zinc-300'}`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição do Problema</label>
                <div className="relative">
                  <MessageSquare className="absolute top-3 left-3 w-4 h-4 text-zinc-400" />
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ex: Minha torneira está vazando muito..."
                    className="w-full h-24 pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-[3px] text-sm outline-none focus:border-zinc-900 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço de Atendimento</label>
                <div className="relative">
                  <MapPin className="absolute top-3 left-3 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro..."
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm outline-none focus:border-zinc-900 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Telefone de Contato</label>
                <div className="relative">
                  <Phone className="absolute top-3 left-3 w-4 h-4 text-zinc-400" />
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm outline-none focus:border-zinc-900 transition-colors"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="bg-zinc-50 rounded-[3px] p-6 space-y-4 border border-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-[3px] flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">Resumo da Reserva</h3>
                    <p className="text-xs text-zinc-500">Confira os detalhes antes de enviar</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Serviço</span>
                    <span className="text-sm font-bold text-zinc-800">{service.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Data e Hora</span>
                    <span className="text-sm font-bold text-zinc-800">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Prestador</span>
                    <span className="text-sm font-bold text-zinc-800">{service.providerName}</span>
                  </div>
                  <div className="h-px bg-zinc-200 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-900">Total</span>
                    <span className="text-lg font-bold text-indigo-600">{service.price}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-[3px] hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          
          <button 
            disabled={loading || (step === 1 && (!selectedDate || !selectedTime)) || (step === 2 && (!address || !phone))}
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else handleConfirm();
            }}
            className="flex-[2] py-4 bg-zinc-900 text-white font-bold rounded-[3px] hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : step === 3 ? (
              <>Confirmar Reserva</>
            ) : (
              <>Próximo <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
