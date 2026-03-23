import React, { useState, useEffect } from 'react';
import { 
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
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from '../firebase';

interface SupportScreenProps {
  onBack: () => void;
}

export default function SupportScreen({ onBack }: SupportScreenProps) {
  const [user] = useState(auth.currentUser);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [faqs, setFaqs] = useState<any[]>([]);
  const [legal, setLegal] = useState<any[]>([]);

  useEffect(() => {
    // Fetch FAQs
    const unsubFaqs = onSnapshot(collection(db, 'faq'), (snapshot) => {
      setFaqs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'faq');
    });

    // Fetch Legal
    const unsubLegal = onSnapshot(collection(db, 'legal'), (snapshot) => {
      setLegal(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'legal');
    });

    return () => {
      unsubFaqs();
      unsubLegal();
    };
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const SectionHeader = ({ title, icon: Icon, id }: { title: string; icon: any; id: string }) => (
    <button 
      onClick={() => setActiveSection(activeSection === id ? null : id)}
      className="w-full flex items-center justify-between p-4 bg-white border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-zinc-100 rounded-[3px]">
          <Icon className="w-4 h-4 text-zinc-600" />
        </div>
        <span className="text-sm font-bold text-zinc-800">{title}</span>
      </div>
      {activeSection === id ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-200 px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-[3px] transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-800" />
        </button>
        <h1 className="text-xl font-bold text-zinc-900">Suporte e Ajuda</h1>
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
        
        <div className="bg-white border-b border-zinc-100">
          <a 
            href="https://wa.me/855767005" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-[3px]">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-zinc-700">Falar com Suporte (WhatsApp)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </a>

          <SectionHeader title="Perguntas Frequentes" icon={HelpCircle} id="faq" />
          <AnimatePresence>
            {activeSection === 'faq' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-zinc-50/50"
              >
                <div className="p-4 space-y-4">
                  {faqs.length > 0 ? faqs.map((faq: any) => (
                    <div key={faq.id} className="space-y-1">
                      <p className="text-sm font-bold text-zinc-900">{faq.question}</p>
                      <p className="text-xs text-zinc-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )) : (
                    <p className="text-xs text-zinc-400 text-center py-4">Nenhuma pergunta frequente disponível.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SectionHeader title="Termos e Privacidade" icon={FileText} id="legal" />
          <AnimatePresence>
            {activeSection === 'legal' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-zinc-50/50"
              >
                <div className="p-4 space-y-6">
                  {legal.length > 0 ? legal.map((doc: any) => (
                    <div key={doc.id} className="space-y-2">
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase">{doc.type === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}</h3>
                      <p className="text-xs text-zinc-600 whitespace-pre-wrap">{doc.content}</p>
                    </div>
                  )) : (
                    <p className="text-xs text-zinc-400 text-center py-4">Documentos legais não encontrados.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SectionHeader title="Reportar Problema" icon={AlertTriangle} id="report" />
          <AnimatePresence>
            {activeSection === 'report' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-zinc-50/50"
              >
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const message = (form.elements.namedItem('reportMessage') as HTMLTextAreaElement).value;
                    if (!message) return;
                    
                    setLoading(true);
                    try {
                      await addDoc(collection(db, 'reports'), {
                        userId: user?.uid,
                        message,
                        createdAt: serverTimestamp()
                      });
                      showFeedback("Relatório enviado com sucesso!", 'success');
                      form.reset();
                      setActiveSection(null);
                    } catch (error: any) {
                      handleFirestoreError(error, OperationType.WRITE, 'reports');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="p-4 space-y-3"
                >
                  <textarea 
                    name="reportMessage"
                    placeholder="Descreva o problema detalhadamente..."
                    className="w-full h-32 p-3 bg-white border border-zinc-200 rounded-[3px] text-sm outline-none focus:border-indigo-500 transition-colors resize-none"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-zinc-900 text-white font-bold rounded-[3px] hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar Relatório'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-[3px]">
                <Star className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-sm font-bold text-zinc-700">Avaliar App</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        <div className="text-center pt-8 pb-12">
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Suporte Oficial</p>
          <p className="text-[10px] text-zinc-400 mt-1">Estamos aqui para ajudar você.</p>
        </div>
      </div>
    </div>
  );
}
