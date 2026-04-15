/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Check, 
  Loader2, 
  X, 
  AlertCircle, 
  ArrowLeft, 
  ChevronRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * UTILS
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 
 * TYPES 
 */
interface Provider {
  id: 'whatsapp-meta' | 'google-calendar' | 'outlook-calendar';
  name: string;
  description: string;
  icon: React.ElementType;
  scopesNeeded: { technical: string; human: string }[];
  status?: 'connected' | 'disconnected';
  lastConnectedAt?: string; // ISO 8601
  metadata?: {
    display_name?: string;
  };
}

interface ConnectedResult {
  provider: 'whatsapp-meta' | 'google-calendar' | 'outlook-calendar';
  token: string; // mock "access_token_xxx"
  refresh_token: string; // mock "refresh_xxx"
  expires_at: string; // ISO 8601
  scopes: string[];
  metadata?: {
    waba_id?: string; // if whatsapp-meta
    phone_id?: string; // if whatsapp-meta
    calendar_id?: string; // if google/outlook
    display_name?: string;
  };
}

interface ConnectProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableProviders: Provider[];
  onConnect: (result: ConnectedResult) => Promise<void>;
  onDisconnect?: (providerId: string) => Promise<void>;
}

/**
 * MOCK DATA
 */
const INITIAL_PROVIDERS: Provider[] = [
  {
    id: 'whatsapp-meta',
    name: 'WhatsApp Business',
    description: 'Conecta tu API de Meta para mensajes.',
    icon: MessageSquare,
    status: 'disconnected',
    scopesNeeded: [
      { technical: 'whatsapp_business_messaging', human: 'Enviar y recibir mensajes por WhatsApp' },
      { technical: 'whatsapp_business_management', human: 'Administrar plantillas y número' },
    ],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sincroniza tus citas y disponibilidad.',
    icon: Calendar,
    status: 'connected',
    lastConnectedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    metadata: { display_name: 'juan@clinica.cl' },
    scopesNeeded: [
      { technical: 'calendar.readonly', human: 'Leer eventos de tu calendario' },
      { technical: 'calendar.events', human: 'Crear, editar, eliminar eventos en tu calendario' },
    ],
  },
  {
    id: 'outlook-calendar',
    name: 'Outlook Calendar',
    description: 'Sincroniza con tu cuenta de Microsoft.',
    icon: Calendar,
    status: 'disconnected',
    scopesNeeded: [
      { technical: 'Calendars.Read', human: 'Leer tu calendario de Outlook' },
      { technical: 'Calendars.ReadWrite', human: 'Gestionar tus eventos' },
    ],
  },
];

/**
 * COMPONENT: ConnectProviderModal
 */
const ConnectProviderModal: React.FC<ConnectProviderModalProps> = ({
  open,
  onOpenChange,
  availableProviders,
  onConnect,
  onDisconnect,
}) => {
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedProvider(null);
      setIsConnecting(false);
      setConnectionStatus('idle');
      setErrorMsg(null);
    }
  }, [open]);

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
  };

  const simulateConnection = async (shouldFail = false) => {
    setIsConnecting(true);
    setErrorMsg(null);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    if (shouldFail) {
      setIsConnecting(false);
      setConnectionStatus('error');
      setErrorMsg("Error de conexión. Por favor, reintenta.");
      return;
    }

    const mockResult: ConnectedResult = {
      provider: selectedProvider!.id,
      token: 'access_token_mock_123',
      refresh_token: 'refresh_mock_456',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      scopes: selectedProvider!.scopesNeeded.map(s => s.technical),
      metadata: {
        display_name: selectedProvider!.id === 'whatsapp-meta' ? '+56 9 1234 5678' : 'usuario@clinica.cl'
      }
    };

    setConnectionStatus('success');
    setIsConnecting(false);
    await onConnect(mockResult);
  };

  const handleAuthorize = () => {
    if (!selectedProvider) return;
    handleStepChange(3);
    simulateConnection();
  };

  // Accessibility: Focus trap is handled by @base-ui/react Dialog
  // Esc key handling: Dialog handles it, but we can prevent it if needed
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && step > 1 && connectionStatus !== 'success') {
      const confirmClose = window.confirm("¿Estás seguro de que deseas cancelar la conexión?");
      if (!confirmClose) return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
        <Dialog.Popup 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-card-bg border border-border-subtle rounded-2xl shadow-2xl z-50 overflow-hidden focus:outline-none"
          aria-labelledby="modal-title"
        >
          {/* Progress Bar */}
          <div className="h-1 w-full bg-white/5">
            <div 
              className="h-full bg-[#167272] transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
              aria-hidden="true"
            />
          </div>

          <div className="p-8 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2" aria-live="polite">
                <span className="text-xs font-medium text-[#888] uppercase tracking-wider">
                  Paso {step} de 3
                </span>
              </div>
              <Dialog.Close className="text-[#888] hover:text-white transition-colors p-1" aria-label="Cerrar modal">
                <X size={20} />
              </Dialog.Close>
            </div>

            {/* Slider Container */}
            <div className="relative h-[420px] sm:h-[400px] overflow-hidden">
              <div 
                className="flex h-full step-transition"
                style={{ 
                  width: '300%',
                  transform: `translateX(-${(step - 1) * (100 / 3)}%)` 
                }}
              >
                {/* STEP 1: SELECT PROVIDER */}
                <div className="w-1/3 h-full flex-shrink-0">
                  <h2 id="modal-title" className="text-xl font-semibold mb-4 text-white">Selecciona un proveedor</h2>
                  <div className="grid gap-3">
                    {availableProviders.map((p) => (
                      <div key={p.id} className="relative">
                        {p.status === 'connected' ? (
                          <div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-white/[0.02] opacity-60">
                            <div className="flex items-center gap-4">
                              <p.icon className="text-primary" size={24} />
                              <div>
                                <p className="font-medium text-white">{p.name}</p>
                                <p className="text-xs text-text-secondary">Ya conectado</p>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDisconnect?.(p.id);
                              }}
                              className="text-xs text-primary hover:text-primary-hover font-semibold transition-colors"
                              aria-label={`Desconectar ${p.name}`}
                            >
                              Desconectar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedProvider(p);
                              handleStepChange(2);
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-white/[0.02] hover:border-primary hover:bg-primary/5 transition-all text-left group scale-100 active:scale-[0.98]"
                            aria-label={`Conectar ${p.name}`}
                          >
                            <div className="flex items-center gap-4">
                              <p.icon className="text-text-secondary group-hover:text-primary transition-colors" size={24} />
                              <div>
                                <p className="font-medium text-white group-hover:text-white">{p.name}</p>
                                <p className="text-sm text-text-secondary line-clamp-1">{p.description}</p>
                              </div>
                            </div>
                            <ChevronRight size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="absolute bottom-0 left-0">
                    <button 
                      onClick={() => onOpenChange(false)}
                      className="text-sm text-[#888] hover:text-white transition-colors py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>

                {/* STEP 2: REVIEW PERMISSIONS */}
                <div className="w-1/3 h-full flex-shrink-0">
                  {selectedProvider && (
                    <div className="flex flex-col h-full">
                      <button 
                        onClick={() => handleStepChange(1)}
                        className="flex items-center gap-2 text-sm text-[#888] hover:text-white mb-4 transition-colors w-fit"
                      >
                        <ArrowLeft size={16} /> Atrás
                      </button>
                      <h2 className="text-xl font-semibold mb-1 text-white">Permisos solicitados por {selectedProvider.name}</h2>
                      <p className="text-sm text-[#888] mb-6">SurGira requiere los siguientes accesos:</p>

                      <div className="space-y-4 mb-6 overflow-y-auto no-scrollbar pr-1">
                        {selectedProvider.scopesNeeded.map((scope, idx) => (
                          <div key={idx} className="flex gap-3 items-start animate-slide-in" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="mt-1">
                              <div className="w-5 h-5 rounded border border-[#167272] flex items-center justify-center bg-[#167272]/20">
                                <Check size={12} className="text-[#167272]" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{scope.human}</p>
                              <p className="text-xs text-[#888]">{scope.technical}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#167272]/10 border border-[#167272]/20 rounded-lg p-4 mb-6">
                        <div className="flex gap-3">
                          <ShieldCheck className="text-[#167272] shrink-0" size={18} />
                          <p className="text-xs text-[#167272] leading-relaxed">
                            SurGira solo accede a estos datos para el funcionamiento del servicio. Puedes revocar en cualquier momento.
                          </p>
                        </div>
                      </div>

                      {errorMsg && (
                        <div className="flex items-center gap-2 text-[#EF4444] text-sm mb-4">
                          <AlertCircle size={16} />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <div className="mt-auto grid grid-cols-[1fr_2fr] gap-3">
                        <button 
                          onClick={() => handleStepChange(1)}
                          className="py-3 rounded-lg border border-border-subtle text-white font-medium hover:bg-white/5 transition-colors"
                        >
                          Atrás
                        </button>
                        <button 
                          onClick={handleAuthorize}
                          className="py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                        >
                          Autorizar en {selectedProvider.name}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 3: CONNECTING / SUCCESS */}
                <div className="w-1/3 h-full flex-shrink-0 text-center flex flex-col items-center justify-center">
                  {isConnecting ? (
                    <div className="space-y-4">
                      <Loader2 className="w-12 h-12 text-[#167272] animate-spin mx-auto" />
                      <p className="text-lg font-medium text-white">Conectando con {selectedProvider?.name}...</p>
                      <p className="text-sm text-[#888]">Esto tomará solo unos segundos.</p>
                    </div>
                  ) : connectionStatus === 'success' ? (
                    <div className="space-y-6 w-full animate-in fade-in zoom-in duration-500">
                      <div className="w-20 h-20 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto">
                        <Check className="text-[#10B981] w-12 h-12" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">¡Conectado!</h2>
                        <p className="text-[#888] text-sm mb-6">Tu cuenta ha sido vinculada exitosamente.</p>
                      </div>
                      
                      <div className="bg-white/5 rounded-xl p-4 text-left w-full border border-white/5">
                        <p className="text-[10px] text-[#888] uppercase tracking-widest mb-1 font-bold">Cuenta vinculada</p>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white">{selectedProvider?.metadata?.display_name || 'Activo'}</p>
                          <span className="text-[10px] bg-[#10B981]/20 text-[#10B981] px-2 py-0.5 rounded-full font-bold">VERIFICADO</span>
                        </div>
                      </div>

                      <div className="w-full pt-4">
                        <button 
                          onClick={() => onOpenChange(false)}
                          className="w-full py-3 rounded-lg bg-white text-black font-bold hover:bg-white/90 transition-colors shadow-xl"
                        >
                          Volver al panel
                        </button>
                      </div>
                    </div>
                  ) : connectionStatus === 'error' ? (
                    <div className="space-y-6 w-full">
                       <div className="w-16 h-16 bg-[#EF4444]/20 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="text-[#EF4444] w-10 h-10" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white mb-2">Error de autorización</h2>
                        <p className="text-sm text-[#888] px-8">{errorMsg || "No pudimos completar la conexión. Revisa tu conexión o intenta de nuevo."}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2 w-full pt-4">
                        <button 
                          onClick={handleAuthorize}
                          className="w-full py-3 rounded-lg bg-[#167272] text-white font-semibold hover:bg-[#0F5858] transition-colors"
                        >
                          Reintentar
                        </button>
                        <button 
                          onClick={() => handleStepChange(1)}
                          className="w-full py-3 rounded-lg bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                        >
                          Elegir otro proveedor
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* FOOTER LINKS */}
            {step < 3 && (
              <div className="mt-8 pt-4 border-t border-white/5 flex justify-center gap-6 text-[10px] text-[#888] uppercase tracking-widest font-bold">
                <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                <a href="#" className="hover:text-white transition-colors">Condiciones</a>
                <a href="#" className="hover:text-white transition-colors flex items-center gap-1">Soporte <ExternalLink size={10} /></a>
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/**
 * MAIN APP COMPONENT
 */
export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>(INITIAL_PROVIDERS);

  const handleConnect = async (result: ConnectedResult) => {
    // Update local state to reflect connection
    setProviders(prev => prev.map(p => {
      if (p.id === result.provider) {
        return { 
          ...p, 
          status: 'connected', 
          lastConnectedAt: new Date().toISOString(),
          metadata: { display_name: result.metadata?.display_name }
        };
      }
      return p;
    }));
  };

  const handleDisconnect = async (id: string) => {
    const confirm = window.confirm("¿Estás seguro de que deseas desconectar este proveedor?");
    if (!confirm) return;
    
    setProviders(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: 'disconnected', metadata: undefined, lastConnectedAt: undefined };
      }
      return p;
    }));
  };

  const connectedCount = useMemo(() => providers.filter(p => p.status === 'connected').length, [providers]);

  return (
    <div className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-16">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-[#167272] rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">SurGira</h1>
          </div>
          <p className="text-[#888] font-medium">Centro de Control de Comunicaciones</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto px-8 py-3 bg-[#167272] text-white rounded-lg font-bold hover:bg-[#0F5858] transition-all shadow-xl shadow-[#167272]/10 active:scale-95 flex items-center justify-center gap-2"
        >
          Conectar Nuevo Proveedor
        </button>
      </header>

      {/* Dashboard Content */}
      <main>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xs font-bold text-[#888] uppercase tracking-[0.2em]">Tus Integraciones ({connectedCount})</h2>
          <div className="h-px flex-1 bg-white/5 ml-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {providers.map((p) => (
            <div 
              key={p.id} 
              className={cn(
                "p-6 rounded-2xl border transition-all duration-300 group",
                p.status === 'connected' 
                ? 'bg-white/[0.03] border-[#167272]/30 shadow-lg shadow-[#167272]/5' 
                : 'bg-white/[0.01] border-white/5 hover:border-white/10'
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "p-3 rounded-xl transition-colors",
                  p.status === 'connected' ? 'bg-[#167272]/20 text-[#167272]' : 'bg-white/5 text-[#888]'
                )}>
                  <p.icon size={28} />
                </div>
                {p.status === 'connected' ? (
                  <div className="flex flex-col items-end">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981] uppercase bg-[#10B981]/10 px-3 py-1 rounded-full tracking-wider">
                      <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" /> Activo
                    </span>
                    {p.lastConnectedAt && (
                      <span className="text-[9px] text-[#888] mt-2">Desde {new Date(p.lastConnectedAt).toLocaleDateString('es-CL')}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-[#888] uppercase bg-white/5 px-3 py-1 rounded-full tracking-wider">
                    Inactivo
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
              <p className="text-sm text-[#888] mb-6 line-clamp-2 leading-relaxed">
                {p.status === 'connected' 
                  ? `Vinculado como: ${p.metadata?.display_name}` 
                  : p.description}
              </p>
              
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                {p.status === 'connected' ? (
                  <button 
                    onClick={() => handleDisconnect(p.id)}
                    className="text-xs text-[#EF4444] hover:text-[#EF4444]/80 transition-colors font-bold uppercase tracking-wider"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setIsModalOpen(true);
                      // Note: Modal logic will handle step reset
                    }}
                    className="text-xs text-[#167272] hover:text-white transition-colors font-bold uppercase tracking-wider"
                  >
                    Configurar
                  </button>
                )}
                <button className="text-[#888] hover:text-white transition-colors">
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State / Info */}
        <div className="p-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-[#888]" size={24} />
          </div>
          <h3 className="text-white font-bold mb-2">Seguridad y Privacidad</h3>
          <p className="text-[#888] text-sm leading-relaxed">
            SurGira utiliza encriptación de grado bancario para proteger tus tokens de acceso. 
            Nunca almacenamos tus mensajes privados ni contraseñas. 
            Puedes revocar el acceso en cualquier momento desde este panel.
          </p>
        </div>
      </main>

      <ConnectProviderModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        availableProviders={providers}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
      
      {/* Footer */}
      <footer className="mt-24 pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 text-[#888] text-xs font-medium">
        <p>© 2026 SurGira CCaaS. Todos los derechos reservados.</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">Documentación API</a>
          <a href="#" className="hover:text-white transition-colors">Estado del Sistema</a>
          <a href="#" className="hover:text-white transition-colors">Privacidad</a>
        </div>
      </footer>
    </div>
  );
}
