/**
 * PotenciaRedes Chile - Main Application Shell
 * Identidad visual oficial inspirada en el logotipo y paleta neón del creador,
 * iconos 3D de fondo para redes sociales (Instagram, TikTok, YouTube, Likes, Seguidores),
 * catálogo en CLP, verificación por Tenpo (-5%) y trazabilidad inmutable.
 */
import React, { useState, useEffect } from 'react';
import { Service, PublicConfig, PaymentMethod } from './types.js';
import { TopBar } from './components/TopBar.js';
import { HeroSection } from './components/HeroSection.js';
import { CatalogSection } from './components/CatalogSection.js';
import { FaqSection } from './components/FaqSection.js';
import { TrackingView } from './components/TrackingView.js';
import { AdminPanel } from './components/AdminPanel.js';
import { Footer } from './components/Footer.js';
import { OrderModal } from './components/OrderModal.js';
import { TransferModal } from './components/TransferModal.js';
import { WebpayModal, WebpayResultView } from './components/WebpayModal.js';
import { InDevelopmentModal } from './components/InDevelopmentModal.js';
import { LegalModal } from './components/LegalModal.js';
import { LivePurchaseNotification } from './components/LivePurchaseNotification.js';
import { SocialBackgroundIcons } from './components/SocialBackgroundIcons.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracking' | 'admin' | 'faq'>('catalog');
  const [services, setServices] = useState<Service[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados de modales de flujo de compra
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);

  // Estado tras creación de orden
  const [createdOrderData, setCreatedOrderData] = useState<{
    orderId: string;
    reference: string;
    trackingToken: string;
    finalPrice: number;
    publicPrice: number;
    discountAmount: number;
    paymentMethod: PaymentMethod;
  } | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isWebpayModalOpen, setIsWebpayModalOpen] = useState<boolean>(false);

  // Modal de funcionalidad en desarrollo
  const [devModal, setDevModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    pendingRequirement?: string;
  }>({
    isOpen: false,
    title: '',
    description: ''
  });

  // Modal legal
  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    tab: 'terms' | 'privacy' | 'refund';
  }>({
    isOpen: false,
    tab: 'terms'
  });

  // Parámetros de URL iniciales
  const [webpayStatus, setWebpayStatus] = useState<string | null>(null);
  const [trackingTokenFromUrl, setTrackingTokenFromUrl] = useState<string>('');
  const [authCodeFromUrl, setAuthCodeFromUrl] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const tokenParam = params.get('token');
    const authParam = params.get('auth');

    if (statusParam) {
      setWebpayStatus(statusParam);
    }
    if (tokenParam) {
      setTrackingTokenFromUrl(tokenParam);
      setActiveTab('tracking');
    }
    if (authParam) {
      setAuthCodeFromUrl(authParam);
    }

    // Cargar configuración comercial pública
    fetch('/api/config/public')
      .then((res) => res.json())
      .then(setConfig)
      .catch(console.error);

    // Cargar catálogo de servicios publicados
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar catálogo:', err);
        setLoading(false);
      });
  }, []);

  const openOrderFlow = (service?: Service) => {
    if (service) setSelectedService(service);
    else if (services.length > 0) setSelectedService(services[0]);
    setIsOrderModalOpen(true);
  };

  const handleOrderCreated = (orderData: {
    orderId: string;
    reference: string;
    trackingToken: string;
    finalPrice: number;
    publicPrice: number;
    discountAmount: number;
    paymentMethod: PaymentMethod;
  }) => {
    setIsOrderModalOpen(false);
    setCreatedOrderData(orderData);

    if (orderData.paymentMethod === 'TENPO_TRANSFER') {
      setIsTransferModalOpen(true);
    } else {
      setIsWebpayModalOpen(true);
    }
  };

  const handleGoToTracking = (token: string) => {
    setIsTransferModalOpen(false);
    setIsWebpayModalOpen(false);
    setWebpayStatus(null);
    setTrackingTokenFromUrl(token);
    setActiveTab('tracking');
    window.history.pushState({}, '', `?token=${encodeURIComponent(token)}`);
  };

  const openDevModal = (title: string, description: string, pendingRequirement?: string) => {
    setDevModal({
      isOpen: true,
      title,
      description,
      pendingRequirement
    });
  };

  const openLegalModal = (tab: 'terms' | 'privacy' | 'refund' = 'terms') => {
    setLegalModal({ isOpen: true, tab });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 font-sans selection:bg-fuchsia-600 selection:text-white relative overflow-x-hidden">
      {/* Iconos y Reacciones 3D Flotantes en el Fondo de la Página */}
      <SocialBackgroundIcons />

      {/* 1. Barra de Navegación Top Bar */}
      <TopBar
        activeTab={activeTab}
        onNavigate={(tab) => {
          setWebpayStatus(null);
          setActiveTab(tab);
        }}
        onOpenOrderModal={() => openOrderFlow()}
        onOpenDevModal={openDevModal}
      />

      {/* 2. Contenido Principal */}
      <main className="flex-1 relative z-10">
        {/* Retorno de Webpay Plus si aplica */}
        {webpayStatus ? (
          <WebpayResultView
            status={webpayStatus}
            trackingToken={trackingTokenFromUrl}
            authCode={authCodeFromUrl}
            onGoToTracking={handleGoToTracking}
            onGoToCatalog={() => {
              setWebpayStatus(null);
              setActiveTab('catalog');
              window.history.pushState({}, '', '/');
            }}
          />
        ) : activeTab === 'catalog' ? (
          <>
            <HeroSection
              onExploreCatalog={() => {
                const el = document.getElementById('catalogo');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenTracking={() => setActiveTab('tracking')}
              onOpenLegal={() => openLegalModal('terms')}
            />
            <CatalogSection
              services={services}
              onSelectService={(srv) => openOrderFlow(srv)}
              onOpenDevModal={openDevModal}
            />
            <FaqSection />
          </>
        ) : activeTab === 'tracking' ? (
          <TrackingView
            initialToken={trackingTokenFromUrl}
            onOpenTransferModal={(data) => {
              setCreatedOrderData(data);
              setIsTransferModalOpen(true);
            }}
            onOpenWebpayModal={(data) => {
              setCreatedOrderData(data);
              setIsWebpayModalOpen(true);
            }}
            onOpenDevModal={openDevModal}
            supportWhatsapp={config?.support.whatsapp}
          />
        ) : activeTab === 'faq' ? (
          <div className="py-8">
            <FaqSection />
          </div>
        ) : (
          <AdminPanel onOpenDevModal={openDevModal} />
        )}
      </main>

      {/* 3. Pie de Página */}
      <Footer
        onOpenLegal={openLegalModal}
        onNavigate={setActiveTab}
        onOpenDevModal={openDevModal}
        supportEmail={config?.support.email}
        supportWhatsapp={config?.support.whatsapp}
      />

      {/* 4. Modales de Flujo de Compra */}
      <OrderModal
        isOpen={isOrderModalOpen}
        service={selectedService}
        services={services}
        onClose={() => setIsOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
        onOpenLegal={() => openLegalModal('terms')}
      />

      {createdOrderData && (
        <TransferModal
          isOpen={isTransferModalOpen}
          orderInfo={createdOrderData}
          config={config}
          onClose={() => setIsTransferModalOpen(false)}
          onGoToTracking={handleGoToTracking}
        />
      )}

      {createdOrderData && (
        <WebpayModal
          isOpen={isWebpayModalOpen}
          orderInfo={createdOrderData}
          onClose={() => setIsWebpayModalOpen(false)}
          onGoToTracking={handleGoToTracking}
        />
      )}

      {/* 5. Modales de Apoyo y Conformidad */}
      <InDevelopmentModal
        isOpen={devModal.isOpen}
        title={devModal.title}
        description={devModal.description}
        pendingRequirement={devModal.pendingRequirement}
        supportWhatsapp={config?.support.whatsapp}
        onClose={() => setDevModal({ isOpen: false, title: '', description: '' })}
      />

      <LegalModal
        isOpen={legalModal.isOpen}
        initialTab={legalModal.tab}
        onClose={() => setLegalModal({ isOpen: false, tab: 'terms' })}
      />

      {/* 6. Notificación flotante de compra reciente (8 segundos, aleatoria y espaciada) */}
      <LivePurchaseNotification />
    </div>
  );
}
