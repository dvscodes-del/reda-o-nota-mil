/**
 * Utilitário de Notificações do Dispositivo (Web Notifications / Service Worker)
 * Permite que mensagens, correções de redação e notificações cheguem diretamente
 * na central de notificações do celular, tablet ou computador do usuário.
 */

export type DeviceNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface DeviceNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
  sound?: boolean;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Verifica se o navegador suporta a API de Notificações
 */
export function isDeviceNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Retorna o status atual de permissão do dispositivo
 */
export function getDeviceNotificationPermission(): DeviceNotificationPermission {
  if (!isDeviceNotificationSupported()) return 'unsupported';
  return Notification.permission as DeviceNotificationPermission;
}

/**
 * Registra o Service Worker para garantir notificações mesmo em segundo plano
 */
export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = registration;
    return registration;
  } catch (err) {
    console.warn('Não foi possível registrar o Service Worker para notificações:', err);
    return null;
  }
}

/**
 * Solicita permissão ao usuário para enviar notificações para o dispositivo
 */
export async function requestDeviceNotificationPermission(): Promise<DeviceNotificationPermission> {
  if (!isDeviceNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerNotificationServiceWorker();
    }
    return permission as DeviceNotificationPermission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificações:', err);
    return getDeviceNotificationPermission();
  }
}

/**
 * Toca um som suave de sino/chime sintetizado via Web Audio API
 * Funciona em qualquer navegador moderno sem necessidade de baixar arquivos de áudio externos.
 */
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Primeiro tom suave (880Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Segundo tom harmônico (1320Hz - E6) ligeiramente deslocado
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.08);
    gain2.gain.setValueAtTime(0.06, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Falha silenciosa de áudio caso o navegador bloqueie autoplay
  }
}

/**
 * Dispara vibração no celular do usuário (se suportado)
 */
export function triggerDeviceVibration(pattern: number[] = [150, 80, 150]): void {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Falha silenciosa
  }
}

/**
 * Envia uma notificação direta para o dispositivo eletrônico do usuário
 * (Central de Notificações do Windows/Mac, barra de avisos do Android/iOS)
 */
export async function sendDeviceNotification({
  title,
  body,
  icon = '/favicon.ico',
  badge = '/favicon.ico',
  tag,
  url = '/',
  data,
  sound = true,
}: DeviceNotificationPayload): Promise<boolean> {
  if (!isDeviceNotificationSupported()) return false;

  const permission = Notification.permission;
  if (permission !== 'granted') return false;

  // Som e vibração
  if (sound) {
    playNotificationSound();
  }
  triggerDeviceVibration([150, 80, 150]);

  const notificationOptions: NotificationOptions = {
    body,
    icon,
    badge,
    tag: tag || `escreva-notif-${Date.now()}`,
    data: {
      url,
      ...data,
    },
    silent: true, // silenciamos o bip padrão do OS pois usamos nosso chime de alta qualidade
  };

  try {
    // Tenta primeiro via Service Worker (melhor para mobile e fundo)
    if ('serviceWorker' in navigator) {
      const reg = swRegistration || (await navigator.serviceWorker.getRegistration());
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }

    // Fallback para Notification API direta da janela
    const notification = new Notification(title, notificationOptions);

    notification.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (url && url !== '/') {
        window.location.href = url;
      }
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('Erro ao disparar notificação no dispositivo:', err);
    return false;
  }
}

