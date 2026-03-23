import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Camera, 
  Key, 
  LogOut, 
  Trash2, 
  Bell, 
  Moon, 
  Sun, 
  Palette, 
  Globe, 
  Lock, 
  Eye, 
  EyeOff, 
  Phone, 
  UserX, 
  CreditCard, 
  MessageCircle, 
  HelpCircle, 
  FileText, 
  AlertTriangle, 
  Star, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  updateProfile, 
  updatePassword, 
  deleteUser, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
  signOut
} from '../firebase';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Real-time data
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [privacy, setPrivacy] = useState<any>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [legal, setLegal] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Listen to profile
    const unsubProfile = onSnapshot(doc(db, 'profiles', user.uid), (doc) => {
      setProfile(doc.data());
    });

    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, 'user_settings', user.uid), (doc) => {
      setSettings(doc.data());
    });

    // Listen to privacy
    const unsubPrivacy = onSnapshot(doc(db, 'user_privacy', user.uid), (doc) => {
      setPrivacy(doc.data());
    });

    // Fetch FAQs
    const unsubFaqs = onSnapshot(collection(db, 'faq'), (snapshot) => {
      setFaqs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Legal
    const unsubLegal = onSnapshot(collection(db, 'legal'), (snapshot) => {
      setLegal(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProfile();
      unsubSettings();
      unsubPrivacy();
      unsubFaqs();
      unsubLegal();
    };
  }, [user]);

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onBack();
    } catch (error: any) {
      showFeedback(error.message, 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm("Tem certeza que deseja excluir sua conta? Esta ação é irreversível.")) return;

    setLoading(true);
    try {
      // Delete from Firestore first
      await deleteDoc(doc(db, 'profiles', user.uid));
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteDoc(doc(db, 'user_settings', user.uid));
      await deleteDoc(doc(db, 'user_privacy', user.uid));
      
      // Delete from Auth
      await deleteUser(user);
      onBack();
    } catch (error: any) {
      showFeedback("Erro ao excluir conta. Você pode precisar fazer login novamente para realizar esta ação.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = async (data: any) => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'profiles', user.uid), data);
      showFeedback("Perfil atualizado com sucesso!", 'success');
    } catch (error: any) {
      showFeedback(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSettingsData = async (data: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'user_settings', user.uid), { ...settings, ...data, userId: user.uid }, { merge: true });
    } catch (error: any) {
      showFeedback(error.message, 'error');
    }
  };

  const updatePrivacyData = async (data: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'user_privacy', user.uid), { ...privacy, ...data, userId: user.uid }, { merge: true });
    } catch (error: any) {
      showFeedback(error.message, 'error');
    }
  };

  const SectionHeader = ({ title, icon: Icon, id }: { title: string; icon: any; id: string }) => (
    <button 
      onClick={() => setActiveSection(activeSection === id ? null : id)}
      className="w-full flex items-center justify-between p-4 bg-white border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-zinc-100 rounded-[3px]">
          <Icon className="w-5 h-5 text-zinc-600" />
        </div>
        <span className="font-bold text-zinc-800">{title}</span>
      </div>
      {activeSection === id ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-200 px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-[3px] transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-800" />
        </button>
        <h1 className="text-xl font-bold text-zinc-900">Configurações e Suporte</h1>
      </header>

      {/* Feedback Toast */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg text-white font-bold text-sm ${message.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto mt-2 space-y-0 px-0">
        
        {/* 👤 CONTA */}
        <div className="bg-white border-b border-zinc-100">
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-100 shadow-sm bg-zinc-50">
                <img 
                  src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                  className="w-full h-full object-cover"
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                />
              </div>
              <button 
                onClick={() => {
                  const url = window.prompt("Insira a URL da nova foto de perfil:");
                  if (url) updateProfileData({ photoURL: url });
                }}
                className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div>
              <h3 className="text-base font-bold text-zinc-900">{profile?.displayName || "Usuário"}</h3>
              <p className="text-xs text-zinc-500">{user?.email}</p>
            </div>
          </div>

          <div className="divide-y divide-zinc-50">
            <button 
              onClick={() => {
                const name = window.prompt("Novo nome:", profile?.displayName);
                if (name) updateProfileData({ displayName: name });
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-700">Alterar Nome</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            </button>

            <button 
              onClick={() => {
                const pass = window.prompt("Nova senha (mínimo 6 caracteres):");
                if (pass && pass.length >= 6) {
                  updatePassword(user!, pass).then(() => showFeedback("Senha alterada!", 'success')).catch(e => showFeedback(e.message, 'error'));
                }
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Key className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-700">Alterar Senha</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            </button>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-600">Sair da Conta</span>
              </div>
            </button>

            <button 
              onClick={handleDeleteAccount}
              className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-bold text-rose-600">Excluir Conta</span>
              </div>
            </button>
          </div>
        </div>

        {/* 💰 PLANO */}
        <div className="bg-white border-b border-zinc-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-[3px]">
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900">Plano Atual</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">{profile?.plan || 'Free'}</p>
            </div>
          </div>
          <button 
            onClick={() => updateProfileData({ plan: profile?.plan === 'pro' ? 'free' : 'pro' })}
            className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-bold rounded-[3px] hover:bg-zinc-800 transition-colors"
          >
            {profile?.plan === 'pro' ? 'Downgrade' : 'Atualizar para PRO'}
          </button>
        </div>

        {/* 🔔 NOTIFICAÇÕES */}
        <div className="bg-white border-b border-zinc-100">
          <div className="p-4 bg-zinc-50/50">
            <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Notificações</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {[
              { id: 'notifications_followers', label: 'Seguidores', icon: User },
              { id: 'notifications_messages', label: 'Mensagens', icon: MessageCircle },
              { id: 'notifications_promotions', label: 'Promoções', icon: Star }
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-bold text-zinc-700">{item.label}</span>
                </div>
                <button 
                  onClick={() => updateSettingsData({ [item.id]: !settings?.[item.id] })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings?.[item.id] ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings?.[item.id] ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 🎨 APARÊNCIA */}
        <div className="bg-white border-b border-zinc-100">
          <div className="p-4 bg-zinc-50/50">
            <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Aparência</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings?.theme === 'dark' ? <Moon className="w-4 h-4 text-zinc-400" /> : <Sun className="w-4 h-4 text-zinc-400" />}
                <span className="text-sm font-bold text-zinc-700">Modo Escuro</span>
              </div>
              <button 
                onClick={() => updateSettingsData({ theme: settings?.theme === 'dark' ? 'light' : 'dark' })}
                className={`w-10 h-5 rounded-full transition-colors relative ${settings?.theme === 'dark' ? 'bg-indigo-600' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings?.theme === 'dark' ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-700">Cor Principal</span>
              </div>
              <div className="flex gap-2">
                {['#4f46e5', '#10b981', '#f59e0b', '#ef4444'].map(color => (
                  <button 
                    key={color}
                    onClick={() => updateSettingsData({ primaryColor: color })}
                    className={`w-5 h-5 rounded-full border-2 ${settings?.primaryColor === color ? 'border-zinc-900' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 🌍 IDIOMA */}
        <div className="bg-white border-b border-zinc-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-700">Idioma do App</span>
          </div>
          <select 
            value={settings?.language || 'pt'}
            onChange={(e) => updateSettingsData({ language: e.target.value })}
            className="bg-zinc-50 border border-zinc-200 rounded-[3px] px-2 py-1 text-[10px] font-bold text-zinc-700 outline-none"
          >
            <option value="pt">Português</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* 🔒 PRIVACIDADE */}
        <div className="bg-white border-b border-zinc-100">
          <div className="p-4 bg-zinc-50/50">
            <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Privacidade</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {privacy?.isPublic ? <Eye className="w-4 h-4 text-zinc-400" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
                <span className="text-sm font-bold text-zinc-700">Perfil Público</span>
              </div>
              <button 
                onClick={() => updatePrivacyData({ isPublic: !privacy?.isPublic })}
                className={`w-10 h-5 rounded-full transition-colors relative ${privacy?.isPublic ? 'bg-indigo-600' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${privacy?.isPublic ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-700">Mostrar Telefone</span>
              </div>
              <button 
                onClick={() => updatePrivacyData({ showPhone: !privacy?.showPhone })}
                className={`w-10 h-5 rounded-full transition-colors relative ${privacy?.showPhone ? 'bg-indigo-600' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${privacy?.showPhone ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-3">
                <UserX className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-700">Usuários Bloqueados</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400">{privacy?.blockedUsers?.length || 0}</span>
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </div>
            </button>
          </div>
        </div>

        <div className="text-center pt-8 pb-12">
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Versão 1.0.0</p>
          <p className="text-[10px] text-zinc-400 mt-1">© 2026 Marketplace de Serviços</p>
        </div>
      </div>
    </div>
  );
}
