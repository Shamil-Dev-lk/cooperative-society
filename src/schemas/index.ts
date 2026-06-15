import { z } from 'zod';

// ============================================================
// Member Schema
// ============================================================

export const memberSchema = z.object({
  member_no: z
    .string()
    .min(1, 'Member number is required / සාමාජික අංකය අවශ්‍යයි')
    .max(50, 'Member number too long'),
  name: z
    .string()
    .min(1, 'Name is required / නම අවශ්‍යයි')
    .max(200, 'Name too long'),
  address: z
    .string()
    .min(1, 'Address is required / ලිපිනය අවශ්‍යයි')
    .max(500, 'Address too long'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal(''))
    .default(''),
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .default(''),
  nic: z
    .string()
    .min(1, 'NIC is required / ජා.හැ.ප. අංකය අවශ්‍යයි')
    .regex(/^([0-9]{9}[vVxX]|[0-9]{12})$/, 'Invalid NIC format'),
  joined_date: z
    .string()
    .min(1, 'Joined date is required / සාමාජික වූ දිනය අවශ්‍යයි'),
  share_amount: z
    .number({ invalid_type_error: 'Share amount must be a number' })
    .min(0, 'Share amount cannot be negative')
    .max(99999999, 'Share amount too large'),
  electoral_division_id: z
    .string()
    .uuid('Please select a valid electoral division'),
  category_id: z
    .string()
    .uuid('Please select a valid category'),
});

export type MemberFormData = z.infer<typeof memberSchema>;

// ============================================================
// Settings Schema
// ============================================================

export const settingsSchema = z.object({
  society_name: z.string().min(1, 'Society name is required').max(200),
  address: z.string().min(1, 'Address is required').max(500),
  telephone: z.string().max(20).optional().default(''),
  email: z.string().email('Invalid email').optional().or(z.literal('')).default(''),
  theme_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#CC0000'),
  resend_api_key: z.string().optional().default(''),
  twilio_sid: z.string().optional().default(''),
  twilio_auth_token: z.string().optional().default(''),
  twilio_from_number: z.string().optional().default(''),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

// ============================================================
// Category Schema
// ============================================================

export const categorySchema = z.object({
  category_name: z.string().min(1, 'Category name is required').max(100),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// ============================================================
// Division Schema
// ============================================================

export const divisionSchema = z.object({
  division_name: z.string().min(1, 'Division name is required').max(200),
});

export type DivisionFormData = z.infer<typeof divisionSchema>;

// ============================================================
// Login Schema
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
