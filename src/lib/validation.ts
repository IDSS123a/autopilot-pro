import { z } from 'zod';

// ===== INPUT SANITIZATION =====
export function sanitizeString(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, maxLength);
}

export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email, 254);
  return sanitized.toLowerCase().trim();
}

export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const sanitized = sanitizeString(url, 2048);
  try {
    const parsed = new URL(sanitized);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

// ===== VALIDATION SCHEMAS =====
export const emailSchema = z.string()
  .trim()
  .email('Invalid email address')
  .max(254, 'Email too long');

export const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password too long')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z.string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Name contains invalid characters');

export const phoneSchema = z.string()
  .trim()
  .max(30, 'Phone number too long')
  .regex(/^[\d\s\-+()]*$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

export const urlSchema = z.string()
  .trim()
  .max(2048, 'URL too long')
  .refine((val) => !val || /^https?:\/\//.test(val), 'URL must start with http:// or https://')
  .optional()
  .or(z.literal(''));

export const bioSchema = z.string()
  .trim()
  .max(5000, 'Bio too long')
  .optional()
  .or(z.literal(''));

export const textFieldSchema = z.string()
  .trim()
  .max(500, 'Text too long');

// ===== PROFILE SCHEMA =====
export const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  title: textFieldSchema.optional(),
  company: textFieldSchema.optional(),
  location: textFieldSchema.optional(),
  linkedin: urlSchema,
  website: urlSchema,
  targetRole: textFieldSchema.optional(),
  industries: textFieldSchema.optional(),
  salaryMin: textFieldSchema.optional(),
  bio: bioSchema,
});

// ===== AUTH SCHEMAS =====
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema.optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const passwordResetSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

// ===== VALIDATION HELPERS =====
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { 
      success: false, 
      errors: result.error.errors.map(e => e.message)
    };
  } catch {
    return { success: false, errors: ['Validation failed'] };
  }
}

// ===== RATE LIMITING (client-side) =====
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
}

// ===== SECURITY HEADERS CHECK =====
export function hasSecureContext(): boolean {
  return window.isSecureContext === true;
}
