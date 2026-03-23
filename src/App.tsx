/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Menu, 
  Search, 
  LayoutGrid, 
  Scissors,
  Cpu,
  Palette,
  Sparkles,
  Wrench,
  MoreVertical,
  PlusCircle,
  Home,
  Calendar,
  Compass,
  MessageSquare,
  Bell,
  User as UserIcon,
  LogOut,
  Camera,
  CheckCircle2,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Globe,
  MoreHorizontal,
  X,
  ThumbsUp,
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Grid,
  UserPlus,
  Users,
  Check,
  Info,
  Star,
  ArrowLeft,
  Settings,
  Headphones,
  HelpCircle,
  Clock,
  ClipboardList,
  Plus,
  ChevronRight,
  Filter,
  Send,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Droplets,
  ChevronDown,
  ChevronLeft,
  CheckCheck,
  Tag,
  Video,
  Phone,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { 
  auth, 
  db, 
  storage,
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  setDoc,
  getDoc,
  getDocs,
  where,
  writeBatch,
  deleteDoc,
  addDoc,
  increment,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  ref,
  uploadBytes,
  getDownloadURL,
  limit
} from './firebase';
import type { User } from './firebase';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  verified: boolean;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  plan: 'free' | 'pro';
  role?: 'user' | 'admin';
  createdAt: any;
}

interface Service {
  id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  providerId: string;
  images: string[];
  rating: number;
  createdAt: any;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  // UI helper
  providerName?: string;
  providerPhoto?: string;
}

interface Booking {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  message: string;
  createdAt: any;
  // UI helper
  serviceTitle?: string;
  clientName?: string;
  providerName?: string;
}

interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: any;
}

interface Verification {
  id: string;
  userId: string;
  biFront: string;
  biBack: string;
  selfie: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

// --- Components ---

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<'marketplace' | 'bookings' | 'profile' | 'messages' | 'create-service' | 'verification' | 'chat-detail' | 'service-detail' | 'notifications' | 'public-profile' | 'login' | 'register'>('marketplace');
  const [isLoading, setIsLoading] = useState(false);
  
  // Hash Routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '') || 'marketplace';
      const validViews = ['marketplace', 'bookings', 'profile', 'messages', 'create-service', 'verification', 'chat-detail', 'service-detail', 'notifications', 'public-profile', 'login', 'register'];
      if (validViews.includes(hash)) {
        setCurrentView(hash as any);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Initial sync
    const initialHash = window.location.hash.replace('#/', '');
    if (initialHash) {
      handleHashChange();
    } else {
      window.history.replaceState(null, '', `#/${currentView}`);
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash.replace('#/', '') !== currentView) {
      window.history.pushState(null, '', `#/${currentView}`);
    }
  }, [currentView]);

  // Data States
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [followers, setFollowers] = useState<string[]>([]); // List of followingIds
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboardingShown'));

  // Protected routes and missing data redirects
  useEffect(() => {
    if (isAuthReady && !user) {
      const protectedViews = ['bookings', 'profile', 'messages', 'create-service', 'verification', 'chat-detail', 'notifications'];
      if (protectedViews.includes(currentView)) {
        setCurrentView('login');
      }
    }

    if (currentView === 'service-detail' && !selectedService) {
      setCurrentView('marketplace');
    }
    if (currentView === 'public-profile' && !selectedUser) {
      setCurrentView('marketplace');
    }
    if (currentView === 'chat-detail' && !selectedChat) {
      setCurrentView('messages');
    }
  }, [currentView, user, isAuthReady, selectedService, selectedUser, selectedChat]);

  const categories = [
    { id: 'all', name: 'Todos', icon: LayoutGrid, color: 'bg-black' },
    { id: 'barbers', name: 'Barbeiros', icon: Scissors, color: 'bg-red-800' },
    { id: 'tech', name: 'Tecnicos', icon: Cpu, color: 'bg-blue-900' },
    { id: 'cleaning', name: 'Limpesas', icon: Sparkles, color: 'bg-teal-800' },
    { id: 'mechanics', name: 'Mecanicos', icon: Wrench, color: 'bg-orange-800' },
    { id: 'plumbing', name: 'Canalizadores', icon: Droplets, color: 'bg-indigo-900' },
  ];

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Sync Profile
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (!profileSnap.exists()) {
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuário',
            email: firebaseUser.email || '',
            photoUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            verified: false,
            verificationStatus: 'none',
            plan: 'free',
            role: firebaseUser.email === 'dakfildbanze3@gmail.com' ? 'admin' : 'user',
            createdAt: serverTimestamp()
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(profileSnap.data() as UserProfile);
        }
        if (currentView === 'login' || currentView === 'register') {
          setCurrentView('marketplace');
        }
      } else {
        setProfile(null);
        if (currentView !== 'marketplace' && currentView !== 'register' && currentView !== 'service-detail') {
          setCurrentView('login');
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Listeners
  useEffect(() => {
    if (!user) return;

    // Services
    const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubServices = onSnapshot(servicesQuery, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Service));
    });

    // Bookings
    const bookingsQuery = query(
      collection(db, 'bookings'), 
      where('clientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Booking));
    });

    // Followers (Who I follow)
    const followingQuery = query(collection(db, 'followers'), where('followerId', '==', user.uid));
    const unsubFollowing = onSnapshot(followingQuery, (snapshot) => {
      setFollowers(snapshot.docs.map(doc => (doc.data() as Follow).followingId));
      setFollowingCount(snapshot.size);
    });

    // Followers (Who follows me)
    const followersQuery = query(collection(db, 'followers'), where('followingId', '==', user.uid));
    const unsubFollowers = onSnapshot(followersQuery, (snapshot) => {
      setFollowerCount(snapshot.size);
    });

    return () => {
      unsubServices();
      unsubBookings();
      unsubFollowing();
      unsubFollowers();
    };
  }, [user]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setCurrentView('marketplace');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthReady) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
        {isLoading && <LoadingOverlay />}
        
        {/* Top Header */}
        {currentView === 'marketplace' && (
          <header className="fixed top-0 left-0 right-0 bg-blue-600 text-white z-50 shadow-lg">
            <div className="px-6 py-4 flex items-center">
              <div className="flex items-center gap-4">
                <Menu className="w-6 h-6 cursor-pointer stroke-[3]" />
                <h1 className="text-xl font-bold tracking-tight">Serviiços</h1>
              </div>
              
              {user ? (
                <button 
                  onClick={() => setCurrentView('create-service')}
                  className="ml-auto mr-4 bg-blue-100 text-blue-600 px-4 py-2 rounded-[30px] font-bold text-sm transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Publicar agora...
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentView('login')}
                  className="ml-auto mr-4 bg-blue-100 text-blue-600 px-4 py-2 rounded-[30px] font-bold text-sm transition-transform active:scale-95 flex items-center gap-2"
                >
                  Entrar
                </button>
              )}
              
              <div>
                <Search className="w-6 h-6 cursor-pointer stroke-[3]" />
              </div>
            </div>

            {/* Categories Bar */}
            <div className="px-1 pb-4 flex items-start gap-0 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-1 min-w-[20%] shrink-0 relative group"
                >
                  {/* Icon Background - Larger Round */}
                  <div className={cn(
                    "w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all",
                    cat.color,
                    "opacity-100"
                  )}>
                    <cat.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Category Name (Outside) */}
                  <span className={cn(
                    "text-[11px] font-bold italic text-white text-center leading-tight transition-all",
                    selectedCategory === cat.id ? "opacity-100" : "opacity-80"
                  )}>
                    {cat.name}
                  </span>

                  {/* Selection Indicator (Thick Line matching text width) */}
                  {selectedCategory === cat.id && (
                    <div className="w-full h-1 bg-white rounded-full mt-0.5" />
                  )}
                </button>
              ))}
              
              {/* "Mais" Button */}
              <button className="flex flex-col items-center gap-1 min-w-[20%] shrink-0 group">
                <div className="w-[44px] h-[44px] rounded-full bg-blue-500/50 flex items-center justify-center opacity-100">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold italic text-white text-center leading-tight opacity-80">
                  Mais
                </span>
              </button>
            </div>
          </header>
        )}

        {/* Navigation Rail / Bottom Bar */}
        {currentView !== 'login' && currentView !== 'register' && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-2 py-3 z-50 flex items-center justify-around">
            <NavItem icon={Home} label="Home" active={currentView === 'marketplace'} onClick={() => setCurrentView('marketplace')} />
            <NavItem icon={Calendar} label="Reservas" active={currentView === 'bookings'} onClick={() => user ? setCurrentView('bookings') : setCurrentView('login')} />
            <NavItem icon={Bell} label="Notificações" active={currentView === 'notifications'} onClick={() => user ? setCurrentView('notifications') : setCurrentView('login')} />
            <NavItem icon={MessageSquare} label="Mensagens" active={currentView === 'messages'} onClick={() => user ? setCurrentView('messages') : setCurrentView('login')} />
            <NavItem icon={UserIcon} label="Perfil" active={currentView === 'profile'} onClick={() => user ? setCurrentView('profile') : setCurrentView('login')} />
          </nav>
        )}

        {/* Content Area */}
        <main className={cn(
          "pb-32 px-0 max-w-2xl mx-auto",
          currentView === 'marketplace' ? "pt-[145px]" : "pt-6"
        )}>
          <AnimatePresence mode="wait">
            {!user && currentView === 'login' && (
              <LoginView 
                backgroundImage={services[0]?.images[0]}
                onGoogleLogin={async () => {
                  try {
                    await signInWithPopup(auth, googleProvider);
                    setCurrentView('marketplace');
                  } catch (error) {
                    console.error("Login error:", error);
                  }
                }}
                onSwitchToRegister={() => setCurrentView('register')}
              />
            )}

            {!user && currentView === 'register' && (
              <RegisterView 
                backgroundImage={services[1]?.images[0] || services[0]?.images[0]}
                onSwitchToLogin={() => setCurrentView('login')}
              />
            )}

            {currentView === 'marketplace' && (
              <motion.div 
                key="marketplace"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-0"
              >
                {/* New Gradient Text Section with Lines - Now inside scrollable content */}
                <div className="px-6 py-2 flex items-center gap-3 bg-white border-b border-zinc-100 mb-[2px] mt-1">
                  <div className="flex-1 h-[2px] bg-blue-600 rounded-full"></div>
                  <span className="text-[10px] font-black italic uppercase tracking-tighter text-zinc-900 whitespace-nowrap">
                    Encontre os melhores profissionais perto de si
                  </span>
                  <div className="flex-1 h-[2px] bg-blue-600 rounded-full"></div>
                </div>

                <div className="flex overflow-x-auto gap-[2px] no-scrollbar px-[2px]">
                  {services
                    .filter(s => {
                      if (selectedCategory === 'all') return true;
                      const cat = (s.category || '').toLowerCase();
                      if (selectedCategory === 'barbers') return cat.includes('barbeiro') || cat.includes('barber');
                      if (selectedCategory === 'tech') return cat.includes('tecnico') || cat.includes('técnico') || cat.includes('tech');
                      if (selectedCategory === 'cleaning') return cat.includes('limpeza');
                      if (selectedCategory === 'mechanics') return cat.includes('mecanico') || cat.includes('mecânico') || cat.includes('mechanic');
                      if (selectedCategory === 'plumbing') return cat.includes('canalizador') || cat.includes('plumb');
                      return cat.includes((selectedCategory || '').toLowerCase());
                    })
                    .map(service => (
                    <ServiceCard 
                      key={service.id} 
                      service={service} 
                      onClick={() => {
                        setSelectedService(service);
                        setCurrentView('service-detail');
                      }}
                    />
                  ))}
                  {services.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6 text-zinc-200" />
                      </div>
                      <p className="text-zinc-400 font-medium">Nenhum serviço encontrado.</p>
                    </div>
                  )}
                </div>

                <div className="h-[3px] bg-zinc-400 w-full" />

                <div className="flex flex-col">
                  {services
                    .filter(s => {
                      if (selectedCategory === 'all') return true;
                      const cat = (s.category || '').toLowerCase();
                      if (selectedCategory === 'barbers') return cat.includes('barbeiro') || cat.includes('barber');
                      if (selectedCategory === 'tech') return cat.includes('tecnico') || cat.includes('técnico') || cat.includes('tech');
                      if (selectedCategory === 'cleaning') return cat.includes('limpeza');
                      if (selectedCategory === 'mechanics') return cat.includes('mecanico') || cat.includes('mecânico') || cat.includes('mechanic');
                      if (selectedCategory === 'plumbing') return cat.includes('canalizador') || cat.includes('plumb');
                      return cat.includes((selectedCategory || '').toLowerCase());
                    })
                    .map(service => (
                    <VerticalServiceCard 
                      key={`vertical-${service.id}`} 
                      service={service} 
                      onClick={() => {
                        setSelectedService(service);
                        setCurrentView('service-detail');
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {currentView === 'service-detail' && selectedService && (
              <ServiceDetail 
                service={selectedService} 
                onBack={() => setCurrentView('marketplace')}
                onBook={() => setCurrentView('bookings')}
                currentUser={user}
                onRequireLogin={() => setCurrentView('login')}
              />
            )}

            {currentView === 'create-service' && (
              <CreateService 
                onBack={() => setCurrentView('marketplace')} 
                onSuccess={() => setCurrentView('marketplace')}
                userId={user.uid}
              />
            )}

            {currentView === 'bookings' && (
              <BookingsList bookings={bookings} onBack={() => setCurrentView('marketplace')} />
            )}

            {currentView === 'profile' && (
              <ProfileView 
                profile={profile} 
                onLogout={handleLogout} 
                onVerify={() => setCurrentView('verification')}
                onViewProfile={(u) => {
                  setSelectedUser(u);
                  setCurrentView('public-profile');
                }}
                followerCount={followerCount}
                followingCount={followingCount}
              />
            )}

            {currentView === 'verification' && (
              <VerificationView 
                userId={user.uid} 
                onBack={() => setCurrentView('profile')} 
                onSuccess={() => setCurrentView('profile')}
              />
            )}

            {currentView === 'messages' && (
              <ChatList 
                onBack={() => setCurrentView('marketplace')} 
                onSelectChat={(chat) => {
                  setSelectedChat(chat);
                  setCurrentView('chat-detail');
                }}
              />
            )}

            {currentView === 'chat-detail' && selectedChat && (
              <ChatDetail 
                chat={selectedChat}
                onBack={() => setCurrentView('messages')}
              />
            )}

            {currentView === 'notifications' && (
              <NotificationsList onBack={() => setCurrentView('marketplace')} />
            )}

            {currentView === 'public-profile' && selectedUser && (
              <PublicProfileView 
                profile={selectedUser} 
                onBack={() => setCurrentView('marketplace')} 
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    );
}

// --- Sub-Components ---

function LoginView({ onGoogleLogin, onSwitchToRegister, backgroundImage }: { onGoogleLogin: () => void, onSwitchToRegister: () => void, backgroundImage?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col items-center justify-center p-8 space-y-8 relative overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0 opacity-10">
        <img 
          src={backgroundImage || "https://picsum.photos/seed/service/1200/800"} 
          className="w-full h-full object-cover blur-sm"
          alt="background"
        />
      </div>

      <div className="relative z-10 text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic text-blue-600">Serviiços</h1>
        <p className="text-zinc-500 text-sm font-medium">Os melhores profissionais a um clique.</p>
      </div>

      <div className="relative z-10 w-full max-w-xs space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Email</label>
          <input 
            type="email" 
            placeholder="seu@email.com"
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Senha</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>
        
        <button className="w-full bg-blue-600 text-white py-2.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-transform active:scale-95">
          Entrar
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100"></div>
          </div>
          <div className="relative flex justify-center text-[8px] uppercase font-black tracking-widest">
            <span className="bg-white px-2 text-zinc-400">Ou continue com</span>
          </div>
        </div>

        <button 
          onClick={onGoogleLogin}
          className="w-full bg-blue-600 text-white py-2.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-100"
        >
          <Globe className="w-4 h-4" />
          Google
        </button>
      </div>

      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        Não tem conta? {' '}
        <button onClick={onSwitchToRegister} className="text-blue-600 font-black">Cadastre-se</button>
      </p>
    </motion.div>
  );
}

function RegisterView({ onSwitchToLogin, backgroundImage }: { onSwitchToLogin: () => void, backgroundImage?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col items-center justify-center p-8 space-y-8 relative overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0 opacity-10">
        <img 
          src={backgroundImage || "https://picsum.photos/seed/register/1200/800"} 
          className="w-full h-full object-cover blur-sm"
          alt="background"
        />
      </div>

      <div className="relative z-10 text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic text-blue-600">Criar Conta</h1>
        <p className="text-zinc-500 text-sm font-medium">Junte-se à maior rede de serviços.</p>
      </div>

      <div className="relative z-10 w-full max-w-xs space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nome Completo</label>
          <input 
            type="text" 
            placeholder="Seu Nome"
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Email</label>
          <input 
            type="email" 
            placeholder="seu@email.com"
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Senha</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>
        
        <button className="w-full bg-blue-600 text-white py-2.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-transform active:scale-95">
          Cadastrar
        </button>
      </div>

      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        Já tem conta? {' '}
        <button onClick={onSwitchToLogin} className="text-blue-600 font-black">Faça Login</button>
      </p>
    </motion.div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all active:scale-90",
        active ? "text-zinc-900" : "text-zinc-400"
      )}
    >
      <Icon className={cn("w-[20px] h-[20px] stroke-[3]", active ? "text-zinc-900" : "text-zinc-400")} />
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function ServiceCard({ service, onClick }: { service: Service, onClick: () => void, key?: any }) {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group bg-white border border-zinc-100 rounded-[3px] overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-zinc-100 transition-all min-w-[280px] sm:min-w-[320px]"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-zinc-100">
        <img 
          src={service.images?.[0] || `https://picsum.photos/seed/${service.id}/800/600`} 
          alt={service.title} 
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-zinc-900">
          MT {service.price.toLocaleString()}
        </div>
        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest text-white">
          {service.category}
        </div>
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-xs font-bold text-zinc-900 truncate">{service.title}</h3>
          <div className="flex items-center gap-0.5 text-zinc-900 shrink-0">
            <Star className="w-2.5 h-2.5 fill-zinc-900" />
            <span className="text-[10px] font-black">{service.rating.toFixed(1)}</span>
          </div>
        </div>
        <p className="text-zinc-500 text-[10px] line-clamp-1 leading-tight">{service.description}</p>
      </div>
    </motion.div>
  );
}

function VerticalServiceCard({ service, onClick }: { service: Service, onClick: () => void, key?: any }) {
  return (
    <div className="bg-white pb-4 border-b border-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200">
            <img src={service.providerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${service.providerId}`} alt="Provider" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-zinc-900 leading-none">{service.providerName || 'Profissional'}</span>
            <span className="text-[10px] text-zinc-500">{service.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-blue-500 text-white px-4 py-1.5 rounded-[4px] text-xs font-bold">Seguir</button>
          <MoreVertical className="w-5 h-5 text-zinc-900" />
        </div>
      </div>

      {/* Image */}
      <div className="w-full aspect-[4/5] bg-zinc-100 relative cursor-pointer" onClick={onClick}>
        <img 
          src={service.images?.[0] || `https://picsum.photos/seed/${service.id}/800/1000`} 
          alt={service.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        {/* Price tag */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white">
          MT {service.price.toLocaleString()}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 bg-zinc-100 px-2.5 py-1.5 rounded-[3px] transition-colors hover:bg-zinc-200">
            <Heart className="w-5 h-5 text-zinc-900" />
            <span className="text-xs font-bold text-zinc-900">{service.likesCount || 0}</span>
          </button>
          <button className="flex items-center gap-1.5 bg-zinc-100 px-2.5 py-1.5 rounded-[3px] transition-colors hover:bg-zinc-200">
            <MessageCircle className="w-5 h-5 text-zinc-900" />
            <span className="text-xs font-bold text-zinc-900">{service.commentsCount || 0}</span>
          </button>
          <button className="flex items-center gap-1.5 bg-zinc-100 px-2.5 py-1.5 rounded-[3px] transition-colors hover:bg-zinc-200">
            <Send className="w-5 h-5 text-zinc-900" />
            <span className="text-xs font-bold text-zinc-900">{service.sharesCount || 0}</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-100 px-2.5 py-1.5 rounded-[3px]">
          <Star className="w-5 h-5 fill-zinc-900 text-zinc-900" />
          <span className="text-xs font-bold text-zinc-900">{service.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 space-y-1">
        <p className="text-sm">
          <span className="font-bold mr-2">{service.providerName || 'Profissional'}</span>
          {service.title}
        </p>
        <p className="text-xs text-zinc-500 line-clamp-2">{service.description}</p>
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-2 cursor-pointer">Ver todos os comentários</p>
      </div>
    </div>
  );
}

function ServiceDetail({ service, onBack, onBook, currentUser, onRequireLogin }: { service: Service, onBack: () => void, onBook: () => void, currentUser: User | null, onRequireLogin: () => void }) {
  const [isBooking, setIsBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingMsg, setBookingMsg] = useState('');

  const handleBooking = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (!bookingDate || !bookingTime) {
      alert("Por favor, selecione data e hora.");
      return;
    }
    setIsBooking(true);
    try {
      const bookingId = doc(collection(db, 'bookings')).id;
      await setDoc(doc(db, 'bookings', bookingId), {
        id: bookingId,
        clientId: currentUser.uid,
        providerId: service.providerId,
        serviceId: service.id,
        serviceTitle: service.title,
        date: bookingDate,
        time: bookingTime,
        status: 'pending',
        message: bookingMsg,
        createdAt: serverTimestamp()
      });
      alert("Reserva enviada com sucesso!");
      onBook();
    } catch (error) {
      console.error("Booking error:", error);
      alert("Erro ao realizar reserva.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="sticky top-0 bg-white z-10 shadow-sm -mx-4 px-4 py-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-zinc-600 hover:bg-zinc-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-zinc-900">Detalhes do serviço</h2>
        </div>
      </header>

      <div className="aspect-video rounded-3xl overflow-hidden bg-zinc-100 shadow-2xl shadow-zinc-100">
        <img 
          src={service.images?.[0] || `https://picsum.photos/seed/${service.id}/1200/800`} 
          alt={service.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-zinc-900">{service.title}</h1>
          <div className="text-2xl font-black text-zinc-900">MT {service.price.toLocaleString()}</div>
        </div>

        <p className="text-zinc-500 leading-relaxed text-lg">{service.description}</p>

        <div className="p-8 bg-zinc-50 rounded-3xl space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900">Reservar Agora</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Data</label>
              <input 
                type="date" 
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full bg-white border border-zinc-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Hora</label>
              <input 
                type="time" 
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full bg-white border border-zinc-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Mensagem (Opcional)</label>
            <textarea 
              value={bookingMsg}
              onChange={(e) => setBookingMsg(e.target.value)}
              placeholder="Algum detalhe especial?"
              className="w-full bg-white border border-zinc-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all min-h-[100px]"
            />
          </div>
          <button 
            onClick={handleBooking}
            disabled={isBooking}
            className="w-full bg-zinc-900 text-white py-5 rounded-[3px] font-black uppercase tracking-widest text-sm shadow-xl shadow-zinc-200 transition-transform active:scale-95 disabled:opacity-50"
          >
            {isBooking ? 'Processando...' : (!currentUser ? 'Entrar para Reservar' : 'Confirmar Reserva')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CreateService({ onBack, onSuccess, userId }: { onBack: () => void, onSuccess: () => void, userId: string }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Barbeiro');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !price || !imageFile) {
      alert("Preencha todos os campos e adicione uma imagem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const serviceId = doc(collection(db, 'services')).id;
      
      // Upload Image
      const storageRef = ref(storage, `services/${serviceId}/main.jpg`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      await setDoc(doc(db, 'services', serviceId), {
        id: serviceId,
        title,
        category,
        description,
        price: Number(price),
        providerId: userId,
        images: [imageUrl],
        rating: 5.0,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0
      });

      onSuccess();
    } catch (error) {
      console.error("Create service error:", error);
      alert("Erro ao publicar serviço.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 px-6"
    >
      <header className="sticky top-0 bg-white z-10 shadow-sm -mx-6 px-6 py-4 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-blue-600">Novo serviço</h2>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1">Cadastro de Perfil Profissional</p>
        </div>
        <button onClick={onBack} className="p-2 bg-zinc-100 rounded-[3px] text-zinc-900">
          <X className="w-4 h-4" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div 
          onClick={() => document.getElementById('service-image')?.click()}
          className="aspect-video bg-zinc-50 rounded-[3px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-all overflow-hidden relative"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <>
              <ImageIcon className="w-6 h-6 text-blue-500 mb-2" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center px-4">Adicionar Foto Profissional ou Portfólio</span>
            </>
          )}
          <input id="service-image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Título do Serviço</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Especialista em Manutenção Elétrica"
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Categoria de Atuação</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all appearance-none"
          >
            <option value="Barbeiro">Barbeiro</option>
            <option value="Técnico">Técnico</option>
            <option value="Limpeza">Limpeza</option>
            <option value="Mecânico">Mecânico</option>
            <option value="Canalizador">Canalizador</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Valor Base (MT)</label>
          <input 
            type="number" 
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Descrição Detalhada</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva suas qualificações, experiência e os detalhes do serviço prestado de forma clara e objetiva..."
            className="w-full bg-zinc-50 border border-zinc-100 rounded-[3px] p-3 text-xs font-bold focus:ring-2 focus:ring-blue-600 transition-all min-h-[120px]"
          />
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-transform active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Processando...' : 'Publicar Perfil Profissional'}
        </button>
      </form>
    </motion.div>
  );
}

function BookingsList({ bookings, onBack }: { bookings: Booking[], onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header className="sticky top-0 bg-white z-10 shadow-sm -mx-4 px-4 py-4 mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tighter text-zinc-900">Reservas</h2>
        <button onClick={onBack} className="p-2 bg-zinc-100 rounded-full text-zinc-900">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="space-y-4">
        {bookings.map(booking => (
          <div key={booking.id} className="p-6 bg-white border border-zinc-100 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">{booking.serviceTitle || 'Serviço'}</h4>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {format(new Date(booking.date), "dd 'de' MMMM", { locale: ptBR })} • {booking.time}
                  </p>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                booking.status === 'pending' ? "bg-amber-100 text-amber-700" :
                booking.status === 'accepted' ? "bg-emerald-100 text-emerald-700" :
                "bg-zinc-100 text-zinc-500"
              )}>
                {booking.status}
              </div>
            </div>
            {booking.message && (
              <p className="text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl italic">"{booking.message}"</p>
            )}
          </div>
        ))}
        {bookings.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6 text-zinc-200" />
            </div>
            <p className="text-zinc-400 font-medium">Nenhuma reserva ativa.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProfileView({ profile, onLogout, onVerify, onViewProfile, followerCount, followingCount }: { profile: UserProfile | null, onLogout: () => void, onVerify: () => void, onViewProfile: (user: UserProfile) => void, followerCount: number, followingCount: number }) {
  if (!profile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <header className="sticky top-0 bg-white z-10 shadow-sm -mx-4 px-4 py-4 mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tighter text-zinc-900">Perfil</h2>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="p-2 bg-zinc-100 rounded-full text-zinc-900">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Header with Username and Stats */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-blue-500" />
              )}
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-sm font-bold">0</div>
              <div className="text-[10px] text-zinc-500">posts</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold">{followerCount}</div>
              <div className="text-[10px] text-zinc-500">seguidores</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold">{followingCount}</div>
              <div className="text-[10px] text-zinc-500">seguindo</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2">
        <h2 className="text-sm font-bold">{(profile.name || '').toLowerCase()}</h2>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 px-2">
        <button className="flex-1 bg-blue-500 text-white py-2 rounded-[3px] text-xs font-bold">
          Editar perfil
        </button>
        <button className="flex-1 bg-zinc-800 text-white py-2 rounded-[3px] text-xs font-bold">
          Compartilhar perfil
        </button>
        <button className="bg-zinc-800 text-white p-2 rounded-[3px]">
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Find People Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold">Encontrar pessoas</h3>
          <button className="text-blue-500 text-xs font-bold">Ver tudo</button>
        </div>
        <div className="flex overflow-x-auto gap-3 px-2 no-scrollbar pb-4">
          {[
            { id: '1', name: 'Edilson 🔥🤡', photoUrl: 'https://picsum.photos/seed/ed/200', verified: true, verificationStatus: 'approved', plan: 'pro', email: '', createdAt: null },
            { id: '2', name: 'Daisy Mathe', photoUrl: 'https://picsum.photos/seed/daisy/200', verified: true, verificationStatus: 'approved', plan: 'pro', email: '', createdAt: null },
            { id: '3', name: 'Joel M', photoUrl: 'https://picsum.photos/seed/joel/200', verified: true, verificationStatus: 'approved', plan: 'pro', email: '', createdAt: null }
          ].map((person, i) => (
            <div 
              key={i} 
              onClick={() => onViewProfile(person as UserProfile)}
              className="min-w-[140px] border border-zinc-200 rounded-[3px] p-4 flex flex-col items-center text-center space-y-3 relative cursor-pointer"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="absolute top-2 right-2 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-100">
                <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-[10px] font-bold truncate w-full">{person.name}</div>
                <div className="text-[8px] text-zinc-400">Sugestões para você</div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="w-full bg-blue-500 text-white py-1.5 rounded-[3px] text-[10px] font-bold"
              >
                Seguir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-zinc-100">
        <button className="flex-1 py-3 flex justify-center border-b-2 border-zinc-900">
          <LayoutGrid className="w-5 h-5" />
        </button>
        <button className="flex-1 py-3 flex justify-center text-zinc-400">
          <UserIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Empty State */}
      <div className="py-12 text-center space-y-4">
        <h3 className="text-lg font-bold">Capture o momento com um amigo</h3>
        <button className="bg-zinc-800 text-white px-6 py-2 rounded-[3px] text-xs font-bold">
          Crie seu primeiro post
        </button>
      </div>

      <div className="pt-10">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </button>
      </div>
    </motion.div>
  );
}

function PublicProfileView({ profile, onBack }: { profile: UserProfile, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed inset-0 bg-white z-[60] overflow-y-auto"
    >
      <header className="sticky top-0 bg-white border-b border-zinc-100 px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={onBack}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-bold">{profile.name}</h2>
        </div>
        <div className="flex items-center gap-6">
          <Bell className="w-6 h-6" />
          <MoreVertical className="w-6 h-6" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        <div className="flex items-center gap-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden border border-zinc-100">
              <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-sm">
              NEW
            </div>
          </div>
          <div className="flex-1 flex justify-around">
            <div className="text-center">
              <div className="text-sm font-bold">1</div>
              <div className="text-[10px] text-zinc-500">posts</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold">7</div>
              <div className="text-[10px] text-zinc-500">seguidores</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold">5</div>
              <div className="text-[10px] text-zinc-500">seguindo</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold">{profile.name}</h3>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 bg-zinc-800 text-white py-2 rounded-[3px] text-xs font-bold flex items-center justify-center gap-1">
            Seguindo <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex-1 bg-zinc-800 text-white py-2 rounded-[3px] text-xs font-bold">
            Mensagem
          </button>
        </div>

        <div className="flex border-t border-zinc-100">
          <button className="flex-1 py-3 flex justify-center border-b-2 border-zinc-900">
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button className="flex-1 py-3 flex justify-center text-zinc-400">
            <UserIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <div className="aspect-square bg-zinc-100">
            <img src={profile.photoUrl} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileButton({ icon: Icon, label, sub, onClick }: { icon: any, label: string, sub?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-6 bg-white border border-zinc-100 rounded-3xl hover:bg-zinc-50 transition-all group active:scale-[0.98]"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-all">
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <div className="font-black uppercase tracking-widest text-xs text-zinc-900">{label}</div>
          {sub && <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{sub}</div>}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-zinc-200" />
    </button>
  );
}

function VerificationView({ userId, onBack, onSuccess }: { userId: string, onBack: () => void, onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biFront, setBiFront] = useState<File | null>(null);
  const [biBack, setBiBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biFront || !biBack || !selfie) {
      alert("Por favor, carregue todos os documentos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const verificationId = doc(collection(db, 'verifications')).id;
      
      // Upload Images
      const frontRef = ref(storage, `verifications/${userId}/bi-front.jpg`);
      const backRef = ref(storage, `verifications/${userId}/bi-back.jpg`);
      const selfieRef = ref(storage, `verifications/${userId}/selfie.jpg`);

      await Promise.all([
        uploadBytes(frontRef, biFront),
        uploadBytes(backRef, biBack),
        uploadBytes(selfieRef, selfie)
      ]);

      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        getDownloadURL(frontRef),
        getDownloadURL(backRef),
        getDownloadURL(selfieRef)
      ]);

      await setDoc(doc(db, 'verifications', verificationId), {
        id: verificationId,
        userId,
        biFront: frontUrl,
        biBack: backUrl,
        selfie: selfieUrl,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'users', userId), {
        verificationStatus: 'pending'
      }, { merge: true });

      alert("Pedido de verificação enviado!");
      onSuccess();
    } catch (error) {
      console.error("Verification error:", error);
      alert("Erro ao enviar verificação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="sticky top-0 bg-white z-10 shadow-sm -mx-4 px-4 py-4 mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tighter text-zinc-900">Verificar</h2>
        <button onClick={onBack} className="p-2 bg-zinc-100 rounded-full text-zinc-900">
          <X className="w-5 h-5" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <DocUpload label="BI Frente" onChange={setBiFront} />
        <DocUpload label="BI Verso" onChange={setBiBack} />
        <DocUpload label="Selfie com BI" onChange={setSelfie} />

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-zinc-900 text-white py-5 rounded-[3px] font-black uppercase tracking-widest text-sm shadow-xl shadow-zinc-200 transition-transform active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Documentos'}
        </button>
      </form>
    </motion.div>
  );
}

function DocUpload({ label, onChange }: { label: string, onChange: (file: File) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{label}</label>
      <div 
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
              onChange(file);
              setPreview(URL.createObjectURL(file));
            }
          };
          input.click();
        }}
        className="aspect-video bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-all overflow-hidden relative"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-6 h-6 text-zinc-200" />
        )}
      </div>
    </div>
  );
}

const MOCK_CHATS = [
  { id: 1, name: '+258 84 066 4285', message: 'Tudo bem Grança?', time: '20:42', unread: 1, avatar: 'https://picsum.photos/seed/chat1/100/100' },
  { id: 2, name: '+258 84 555 8656', message: 'Normal mulher itu', time: '20:41', unread: 1, avatar: 'https://picsum.photos/seed/chat2/100/100' },
  { id: 3, name: 'Jully Mulhope', message: '✓✓ Obrigad', time: '20:39', unread: 0, avatar: 'https://picsum.photos/seed/chat3/100/100' },
  { id: 4, name: 'Foco no Aprendizado', message: 'Foi removido/a por +258 84 027 3176', time: '20:42', unread: 1, avatar: 'https://picsum.photos/seed/chat4/100/100' },
  { id: 5, name: '+258 85 018 3795', message: '✓ Oi', time: '20:14', unread: 0, avatar: 'https://picsum.photos/seed/chat5/100/100' },
];

function ChatList({ onBack, onSelectChat }: { onBack: () => void, onSelectChat: (chat: any) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white pb-20"
    >
      <header className="sticky top-0 bg-white z-10 px-4 py-3 space-y-4 border-b border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tighter text-zinc-900">Mensagens</h2>
          <button onClick={onBack} className="p-2 bg-zinc-100 rounded-full text-zinc-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Perguntar à Meta AI ou pesquisar" 
            className="w-full bg-zinc-100 rounded-full py-3 pl-12 pr-4 text-sm font-bold text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button className="px-5 py-2 bg-blue-100 text-blue-600 rounded-full text-xs font-bold whitespace-nowrap">Todas</button>
          <button className="px-5 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold whitespace-nowrap">Não lidas 22</button>
          <button className="px-5 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold whitespace-nowrap">Favoritos</button>
          <button className="px-5 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold whitespace-nowrap">Grupos 10</button>
          <button className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold whitespace-nowrap">+</button>
        </div>
      </header>
      
      <div className="divide-y divide-zinc-50">
        {MOCK_CHATS.map(chat => (
          <div 
            key={chat.id} 
            onClick={() => onSelectChat(chat)}
            className="flex items-center gap-4 p-4 hover:bg-zinc-50 cursor-pointer transition-colors active:bg-zinc-100"
          >
            <img src={chat.avatar} alt={chat.name} className="w-14 h-14 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-zinc-900 truncate">{chat.name}</h3>
                <span className={cn("text-xs font-bold shrink-0", chat.unread > 0 ? "text-blue-600" : "text-zinc-400")}>
                  {chat.time}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-zinc-500 truncate">{chat.message}</p>
                {chat.unread > 0 && (
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {chat.unread}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function NotificationsList({ onBack }: { onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white pb-20"
    >
      <header className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center justify-between border-b border-zinc-100 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 -ml-1 text-zinc-900">
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>
          <h2 className="text-xl font-black tracking-tight text-zinc-900">Notificações</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 bg-zinc-100 rounded-full text-zinc-900">
            <CheckCheck className="w-4 h-4" />
          </button>
          <button className="p-1.5 bg-zinc-100 rounded-full text-zinc-900">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </header>
      
      <div className="px-4 py-3">
        <h3 className="text-sm font-black text-zinc-900 mb-2">Novas</h3>
        
        <div className="space-y-0">
          {/* Notification 1: Friend Request */}
          <div className="flex gap-3 py-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                <UserIcon className="w-2 h-2 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-900 leading-tight">
                <span className="font-bold">Nayra Novela</span> enviou-te um pedido de amizade.
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">20 de março às 06:09 • 10 amigos em comum</p>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 bg-blue-600 text-white py-1.5 rounded-[3px] text-[10px] font-bold">Confirmar</button>
                <button className="flex-1 bg-zinc-200 text-zinc-900 py-1.5 rounded-[3px] text-[10px] font-bold">Eliminar</button>
              </div>
            </div>
            <button className="shrink-0 p-1 text-zinc-400 self-start">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Notification 2: Story */}
          <div className="flex gap-3 py-3 bg-blue-50/50 -mx-4 px-4">
            <div className="relative shrink-0">
              <img src="https://picsum.photos/seed/notif1/100/100" alt="User" className="w-10 h-10 rounded-full object-cover" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-[2px]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-900 leading-tight">
                A tua última história teve 53 visualizações antes de expirar. Podes criar uma história nova.
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">há 20 horas</p>
            </div>
            <button className="shrink-0 p-1 text-zinc-400 self-start">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Notification 3: Tag */}
          <div className="flex gap-3 py-3 bg-blue-50/50 -mx-4 px-4">
            <div className="relative shrink-0">
              <img src="https://picsum.photos/seed/notif2/100/100" alt="User" className="w-10 h-10 rounded-full object-cover" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <Tag className="w-2 h-2 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-900 leading-tight">
                <span className="font-bold">Alexendre Ruben Beweua</span> identificou-te a ti e a <span className="font-bold">Neise Bruno</span> numa publicação.
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">20/03 às 16:26</p>
            </div>
            <button className="shrink-0 p-1 text-zinc-400 self-start">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ChatDetail({ chat, onBack }: { chat: any, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 bg-zinc-50 z-50 flex flex-col"
    >
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-zinc-600 hover:bg-zinc-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h2 className="text-sm font-bold text-zinc-900">{chat.name}</h2>
            <p className="text-[10px] font-bold text-blue-600">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-blue-600">
          <Video className="w-5 h-5" />
          <Phone className="w-5 h-5" />
          <MoreVertical className="w-5 h-5 text-zinc-600" />
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center">
          <span className="bg-zinc-200 text-zinc-600 text-[10px] font-bold px-3 py-1 rounded-full">Hoje</span>
        </div>
        
        {/* Received Message */}
        <div className="flex items-end gap-2">
          <img src={chat.avatar} alt={chat.name} className="w-6 h-6 rounded-full object-cover" />
          <div className="bg-white border border-zinc-100 rounded-2xl rounded-bl-none px-4 py-2 max-w-[75%] shadow-sm">
            <p className="text-sm font-medium text-zinc-900">{chat.message}</p>
            <span className="text-[10px] text-zinc-400 font-bold mt-1 block">{chat.time}</span>
          </div>
        </div>

        {/* Sent Message */}
        <div className="flex items-end gap-2 justify-end">
          <div className="bg-blue-600 text-white rounded-2xl rounded-br-none px-4 py-2 max-w-[75%] shadow-sm">
            <p className="text-sm font-medium">Tudo ótimo! E com você?</p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] text-blue-200 font-bold">Agora</span>
              <CheckCheck className="w-3 h-3 text-blue-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-zinc-100 p-3 shrink-0">
        <div className="flex items-center gap-2 bg-zinc-100 rounded-full px-4 py-2">
          <button className="text-zinc-400 hover:text-blue-600 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            placeholder="Mensagem" 
            className="flex-1 bg-transparent text-sm font-medium text-zinc-900 placeholder:text-zinc-500 focus:outline-none px-2"
          />
          <button className="text-zinc-400 hover:text-blue-600 transition-colors">
            <Camera className="w-5 h-5" />
          </button>
          <button className="text-zinc-400 hover:text-blue-600 transition-colors">
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function OnboardingView({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Bem-vindo", description: "Descubra os melhores serviços profissionais." },
    { title: "Agende", description: "Marque seus horários com facilidade." },
    { title: "Avalie", description: "Compartilhe sua experiência com a comunidade." }
  ];

  return (
    <div className="fixed inset-0 bg-blue-600 z-[100] flex flex-col items-center justify-center p-6 text-white">
      <h1 className="text-4xl font-black mb-4">{steps[step].title}</h1>
      <p className="text-xl mb-8 text-center">{steps[step].description}</p>
      <button 
        onClick={() => {
          if (step < steps.length - 1) setStep(step + 1);
          else onComplete();
        }}
        className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold"
      >
        {step < steps.length - 1 ? "Próximo" : "Começar"}
      </button>
    </div>
  );
}

