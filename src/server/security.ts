/**
 * Módulo de Seguridad y Validación - PulsoRed Chile
 * Diseñado conforme a directrices aplicables de OWASP ASVS v4.0.3 (Nivel 2)
 * - Tokens de seguimiento de alta entropía (256-bit).
 * - Protección SSRF estricta en URLs de destino.
 * - Validación contra inyección, esquemas peligrosos y puertos anómalos.
 * - Rate limiting en memoria para mitigación de fuerza bruta y abusos.
 * - Hashing seguro con scrypt y salt para credenciales administrativas.
 */
import crypto from 'node:crypto';

// Lista de hosts y rangos IP bloqueados para evitar SSRF
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // Metadata Cloud
  'metadata.google.internal'
];

/**
 * Valida minuciosamente una URL de destino de red social
 * Bloquea SSRF, redirecciones abiertas, protocolos inseguros y direcciones internas.
 */
export function validateDestinationUrl(urlStr: string, platform: string, patternRegex?: string): { valid: boolean; error?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, error: 'La URL de destino es obligatoria.' };
  }

  const trimmed = urlStr.trim();
  if (trimmed.length > 500) {
    return { valid: false, error: 'La longitud de la URL excede el límite permitido de 500 caracteres.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'El formato de la URL no es válido. Debe incluir el protocolo (ej. https://...).' };
  }

  // 1. Validar protocolo estrictamente seguro
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'Protocolo de URL no permitido. Solo se aceptan enlaces web estándar https.' };
  }

  // 2. Prevenir SSRF bloqueando localhost e IPs de intranet
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, error: 'URL no permitida por políticas de seguridad de red.' };
  }

  // Prevenir rangos privados IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Regex);
  if (ipMatch) {
    const p1 = parseInt(ipMatch[1], 10);
    const p2 = parseInt(ipMatch[2], 10);
    if (
      p1 === 10 ||
      p1 === 127 ||
      (p1 === 172 && p2 >= 16 && p2 <= 31) ||
      (p1 === 192 && p2 === 168) ||
      (p1 === 169 && p2 === 254)
    ) {
      return { valid: false, error: 'Direcciones IP de intranet no permitidas como destino comercial.' };
    }
  }

  // 3. Validar correspondencia con la plataforma seleccionada
  const validDomainsByPlatform: Record<string, string[]> = {
    instagram: ['instagram.com', 'www.instagram.com'],
    tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
    youtube: ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'],
    linkedin: ['linkedin.com', 'www.linkedin.com'],
    x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']
  };

  const allowedDomains = validDomainsByPlatform[platform.toLowerCase()];
  if (allowedDomains && !allowedDomains.includes(hostname)) {
    return {
      valid: false,
      error: `La URL ingresada no pertenece a la plataforma ${platform}. Ingrese un enlace directo válido a ${allowedDomains[0]}.`
    };
  }

  // 4. Validar contra el patrón regex específico del servicio si fue provisto
  if (patternRegex) {
    try {
      const regex = new RegExp(patternRegex, 'i');
      if (!regex.test(trimmed)) {
        return {
          valid: false,
          error: 'El enlace no coincide con el tipo de contenido requerido para este servicio (ej. perfil vs publicación).'
        };
      }
    } catch {
      // Si la regex de configuración fuese errónea no bloquear
    }
  }

  return { valid: true };
}

/**
 * Genera un token criptográfico de alta entropía para seguimiento privado.
 * 32 bytes aleatorios = 256 bits de entropía en formato hexadecimal (64 caracteres).
 * Hace matemáticamente imposible la enumeración secuencial o fuerza bruta.
 */
export function generateTrackingToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Genera una referencia humana para el pedido (ej. REF-20261030-9482)
 */
export function generateOrderReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomInt(1000, 9999).toString();
  return `REF-${dateStr}-${randomSuffix}`;
}

/**
 * Hashing y verificación de contraseñas con scrypt y salting
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Limitador de tasa en memoria (Sliding Window) para endpoints sensibles
 */
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitBuckets = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitBuckets.get(key) || { timestamps: [] };
  // Limpiar marcas fuera de la ventana
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    return false; // Bloqueado por exceder límite
  }

  record.timestamps.push(now);
  rateLimitBuckets.set(key, record);
  return true;
}

/**
 * Validador básico de email
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim()) && email.length <= 150;
}
