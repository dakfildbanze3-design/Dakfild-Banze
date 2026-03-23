import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock3, 
  ChevronRight, 
  ArrowLeft,
  Trash2,
  Check,
  X,
  Loader2,
  User,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc,
  deleteDoc,
  handleFirestoreError,
  OperationType
} from '../firebase';

interface BookingsScreenProps {
  onBack: () => void;
}

export default function BookingsScreen({ onBack }: BookingsScreenProps) {
  const [user] = useState(auth.currentUser);
  const [clientBookings, setClientBookings] = useState<any[]>([]);
  const [providerBookings, setProviderBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'client' | 'provider'>('client');

  useEffect(() => {
    if (!user) return;

    // Client Bookings
    const qClient = query(
      collection(db, 'bookings'),
      where('clientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubClient = onSnapshot(qClient, (snapshot) => {
      setClientBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    // Provider Bookings
    const qProvider = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubProvider = onSnapshot(qProvider, (snapshot) => {
      setProviderBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => {
      unsubClient();
      unsubProvider();
    };
  }, [user]);

  const updateStatus = async (bookingId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status });
    } catch (error: any) {
      alert("Erro ao atualizar status: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold border border-amber-100">
            <Clock3 className="w-3 h-3" /> Pendente
          </div>
        );
      case 'accepted':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
            <CheckCircle2 className="w-3 h-3" /> Aceito
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-bold border border-rose-100">
            <XCircle className="w-3 h-3" /> Recusado
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-bold border border-zinc-200">
            <XCircle className="w-3 h-3" /> Cancelado
          </div>
        );
      default:
        return null;
    }
  };

  const BookingCard = ({ booking, isProvider }: { booking: any; isProvider: boolean; key?: any }) => (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-100 rounded-[3px] p-5 space-y-4 shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-50 rounded-[3px] flex items-center justify-center border border-zinc-100">
            {isProvider ? <User className="w-5 h-5 text-zinc-400" /> : <Wrench className="w-5 h-5 text-zinc-400" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">{booking.serviceTitle}</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{booking.servicePrice}</p>
          </div>
        </div>
        {getStatusBadge(booking.status)}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-600">{new Date(booking.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-600">{booking.time}</span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-600 truncate">{booking.address}</span>
        </div>
      </div>

      {booking.message && (
        <div className="bg-zinc-50 rounded-[3px] p-3 flex gap-2 border border-zinc-100">
          <MessageSquare className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 italic">"{booking.message}"</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {isProvider && booking.status === 'pending' && (
          <>
            <button 
              onClick={() => updateStatus(booking.id, 'accepted')}
              className="flex-1 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-[3px] hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-3.5 h-3.5" /> Aceitar
            </button>
            <button 
              onClick={() => updateStatus(booking.id, 'rejected')}
              className="flex-1 py-2.5 bg-rose-500 text-white text-xs font-bold rounded-[3px] hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-3.5 h-3.5" /> Recusar
            </button>
          </>
        )}

        {!isProvider && booking.status === 'pending' && (
          <button 
            onClick={() => updateStatus(booking.id, 'cancelled')}
            className="flex-1 py-2.5 bg-zinc-100 text-zinc-500 text-xs font-bold rounded-[3px] hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-3.5 h-3.5" /> Cancelar Reserva
          </button>
        )}

        {booking.status === 'accepted' && (
          <button 
            className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-[3px] hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-3.5 h-3.5" /> Contatar
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-200 px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-800" />
        </button>
        <h1 className="text-xl font-bold text-zinc-900">Minhas Reservas</h1>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-zinc-100 px-4 flex gap-6">
        <button 
          onClick={() => setActiveTab('client')}
          className={`py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'client' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          Minhas Reservas
          {activeTab === 'client' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('provider')}
          className={`py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'provider' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          Recebidas
          {activeTab === 'provider' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900 rounded-t-full" />}
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
            <p className="text-sm text-zinc-400 font-medium">Carregando reservas...</p>
          </div>
        ) : (
          <>
            {activeTab === 'client' ? (
              clientBookings.length > 0 ? (
                clientBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} isProvider={false} />
                ))
              ) : (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-zinc-100">
                    <Calendar className="w-8 h-8 text-zinc-200" />
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">Você ainda não fez nenhuma reserva.</p>
                </div>
              )
            ) : (
              providerBookings.length > 0 ? (
                providerBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} isProvider={true} />
                ))
              ) : (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-zinc-100">
                    <Clock3 className="w-8 h-8 text-zinc-200" />
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">Nenhuma reserva recebida ainda.</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
