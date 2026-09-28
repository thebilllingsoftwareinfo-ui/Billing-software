import { z } from 'zod';

export const createNoteSchema = z.object({
  entity_type: z.enum(['customer', 'supplier']),
  entity_id: z.string().min(1, 'Entity ID is required'),
  note_text: z.string().min(1, 'Note text is required').max(5000, 'Note text cannot exceed 5000 characters'),
});

export const updateNoteSchema = z.object({
  note_text: z.string().min(1, 'Note text is required').max(5000, 'Note text cannot exceed 5000 characters'),
});

export const createFollowUpSchema = z.object({
  entity_type: z.enum(['customer', 'supplier']),
  entity_id: z.string().min(1, 'Entity ID is required'),
  followup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  followup_time: z.string().optional().nullable(),
  followup_type: z.enum(['payment', 'sales', 'quotation', 'general', 'support']),
  purpose: z.string().min(1, 'Purpose is required').max(255, 'Purpose cannot exceed 255 characters'),
  notes: z.string().optional().nullable(),
});

export const updateFollowUpSchema = z.object({
  followup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required').optional(),
  followup_time: z.string().optional().nullable(),
  followup_type: z.enum(['payment', 'sales', 'quotation', 'general', 'support']).optional(),
  purpose: z.string().min(1, 'Purpose is required').max(255, 'Purpose cannot exceed 255 characters').optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
