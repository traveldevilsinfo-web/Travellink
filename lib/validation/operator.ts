import { z } from 'zod'
import { PhoneSchema } from './auth'

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export const OrgCreateSchema = z.object({
  name: z.string().trim().min(2, 'Enter your company name').max(120),
  city: z.string().trim().max(80),
})

export const OrgDetailsSchema = z.object({
  orgId: z.uuid(),
  legalName: z.string().trim().min(2, 'Enter the legal name').max(160),
  gstin: z.string().trim().toUpperCase().regex(GSTIN_RE, 'Enter a valid 15-character GSTIN'),
  gstScheme: z.enum(['gst5_no_itc', 'gst18_with_itc']),
  description: z.string().trim().max(2000),
  city: z.string().trim().min(2).max(80),
  supportPhone: PhoneSchema,
  supportEmail: z.email().max(254),
})

export const KYC_DOC_TYPES = ['pan', 'gst_certificate', 'cancelled_cheque', 'incorporation'] as const
export const REQUIRED_ORG_KYC = ['pan', 'gst_certificate', 'cancelled_cheque'] as const
export const KycDocTypeSchema = z.enum(KYC_DOC_TYPES)

export const OPERATOR_AGREEMENT_VERSION = 'v1'
export const AcceptAgreementSchema = z.object({ orgId: z.uuid(), accept: z.literal(true, 'You must accept the agreement') })

export const ReviewDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ id: z.uuid(), decision: z.literal('approve') }),
  z.object({ id: z.uuid(), decision: z.literal('reject'), notes: z.string().trim().min(5, 'Tell them what to fix').max(2000) }),
])

export type OrgCreateInput = z.input<typeof OrgCreateSchema>
export type OrgDetailsInput = z.input<typeof OrgDetailsSchema>
