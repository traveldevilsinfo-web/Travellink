'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireOrgRole, requireUser } from '@/lib/auth/guards'
import { slugify } from '@/lib/domain/trips'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { sanitizeImage } from '@/lib/media/image'
import { ratelimit } from '@/lib/security/ratelimit'
import { isUniqueViolation, throwIfError } from '@/lib/supabase/errors'
import {
  AcceptAgreementSchema,
  KycDocTypeSchema,
  OPERATOR_AGREEMENT_VERSION,
  OrgCreateSchema,
  OrgDetailsSchema,
} from '@/lib/validation/operator'
import { z } from 'zod'

const KYC_MAX_BYTES = 5 * 1024 * 1024

export async function createOrg(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser('/operator/onboarding')
    const data = OrgCreateSchema.parse(input)
    await ratelimit('org:create', user.id, 5, '1 d')

    const base = slugify(data.name)
    for (let attempt = 0; attempt < 4; attempt++) {
      const slug = attempt === 0 ? base : `${base.slice(0, 44)}-${randomUUID().slice(0, 4)}`
      const { error } = await user.supabase.rpc('create_organization', { p_name: data.name, p_slug: slug, p_city: data.city })
      if (!error) break
      if (!isUniqueViolation(error) || attempt === 3) {
        if (error.code === '54000') throw new AppError('invalid_input', 'You already own the maximum number of companies.')
        throwIfError(error, 'create_organization')
      }
    }
  } catch (e) {
    return toSafeError(e)
  }
  redirect('/operator/onboarding')
}

export async function updateOrgDetails(input: unknown): Promise<ActionResult> {
  try {
    const data = OrgDetailsSchema.parse(input)
    const { supabase } = await requireOrgRole(data.orgId, ['owner', 'manager'], {}, '/operator/onboarding')
    const { error } = await supabase
      .from('organizations')
      .update({
        legal_name: data.legalName,
        gstin: data.gstin,
        state_code: data.gstin.slice(0, 2), // GST place of supply
        gst_scheme: data.gstScheme,
        description: data.description || null,
        city: data.city,
        support_phone: data.supportPhone,
        support_email: data.supportEmail,
      })
      .eq('id', data.orgId)
    throwIfError(error, 'update org')
    revalidatePath('/operator/onboarding')
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function uploadKycDoc(form: FormData): Promise<ActionResult> {
  try {
    const orgId = z.guid().parse(form.get('orgId'))
    const docType = KycDocTypeSchema.parse(form.get('docType'))
    const file = form.get('file')
    const { supabase, id: userId } = await requireOrgRole(orgId, ['owner', 'manager'], {}, '/operator/onboarding')
    await ratelimit('kyc:upload', userId, 20, '1 h')

    if (!(file instanceof File) || file.size === 0) throw new AppError('invalid_input', 'Choose a file to upload')
    if (file.size > KYC_MAX_BYTES) throw new AppError('invalid_input', 'File must be under 5 MB')
    const raw = Buffer.from(await file.arrayBuffer())

    let body: Buffer, contentType: string, ext: string
    if (raw.subarray(0, 5).toString('latin1') === '%PDF-') {
      ;[body, contentType, ext] = [raw, 'application/pdf', 'pdf']
    } else {
      const img = await sanitizeImage(raw, { format: 'jpeg', maxWidth: 2000 })
      ;[body, contentType, ext] = [img.buffer, img.contentType, img.ext]
    }

    const path = `orgs/${orgId}/${docType}-${randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage.from('kyc').upload(path, body, { contentType, upsert: false })
    throwIfError(upErr && { message: upErr.message }, 'kyc upload')
    const { error } = await supabase
      .from('kyc_documents')
      .insert({ owner_type: 'org', owner_id: orgId, doc_type: docType, storage_path: path })
    throwIfError(error, 'kyc row')
    revalidatePath('/operator/onboarding')
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function acceptAgreement(input: unknown): Promise<ActionResult> {
  try {
    const data = AcceptAgreementSchema.parse(input)
    const { supabase } = await requireOrgRole(data.orgId, ['owner'], {}, '/operator/onboarding')
    const { error } = await supabase.rpc('accept_operator_agreement', { p_org: data.orgId, p_version: OPERATOR_AGREEMENT_VERSION })
    throwIfError(error, 'accept agreement')
    revalidatePath('/operator/onboarding')
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}
