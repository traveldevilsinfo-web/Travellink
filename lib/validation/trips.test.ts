import { describe, expect, it } from 'vitest'
import { AffiliateSettingsSchema, DepartureSchema, TripDetailsSchema } from './trips'
import { OrgDetailsSchema } from './operator'

const trip = {
  title: 'Chakrata Weekend', summary: '', descriptionMd: '', tripType: 'group', destination: 'Chakrata', state: '', startCity: '',
  durationDays: '3', durationNights: '2', difficulty: '', minAge: '0', maxGroupSize: '0', fromPriceRupees: '9999',
  inclusions: 'Stay\n\nMeals\n', exclusions: '', highlights: [], thingsToCarry: '', cancellationPolicyId: '00000000-0000-4000-8000-000000000001',
} as const

describe('TripDetailsSchema', () => {
  it('coerces form strings and splits lines', () => {
    const t = TripDetailsSchema.parse(trip)
    expect(t.durationDays).toBe(3)
    expect(t.inclusions).toEqual(['Stay', 'Meals'])
  })
  it('rejects nights that do not fit days', () => {
    expect(TripDetailsSchema.safeParse({ ...trip, durationNights: '5' }).success).toBe(false)
  })
  it('rejects fractional rupees', () => {
    expect(TripDetailsSchema.safeParse({ ...trip, fromPriceRupees: '99.5' }).success).toBe(false)
  })
})

describe('DepartureSchema', () => {
  const dep = {
    startDate: '2026-11-10', endDate: '2026-11-12', capacity: '20', depositPerPersonRupees: '3000', balanceDueDaysBefore: '15', bookingCutoffDays: '2',
    options: [{ label: 'Triple', priceRupees: '10000', isDefault: true }, { label: 'Double', priceRupees: '12000', isDefault: false }],
  }
  it('accepts a valid departure', () => expect(DepartureSchema.safeParse(dep).success).toBe(true))
  it('needs exactly one default option', () => {
    expect(DepartureSchema.safeParse({ ...dep, options: dep.options.map((o) => ({ ...o, isDefault: true })) }).success).toBe(false)
  })
  it('keeps deposit below the lowest price', () => {
    expect(DepartureSchema.safeParse({ ...dep, depositPerPersonRupees: '10000' }).success).toBe(false)
  })
  it('rejects end before start', () => {
    expect(DepartureSchema.safeParse({ ...dep, endDate: '2026-11-09' }).success).toBe(false)
  })
})

describe('OrgDetailsSchema GSTIN', () => {
  const base = { orgId: '00000000-0000-4000-8000-000000000001', legalName: 'Travel Devils Pvt Ltd', gstScheme: 'gst5_no_itc',
    description: '', city: 'Delhi', supportPhone: '9876543210', supportEmail: 'ops@example.com' }
  it('accepts and uppercases a valid GSTIN', () => {
    expect(OrgDetailsSchema.parse({ ...base, gstin: '07aabct1332l1zz' }).gstin).toBe('07AABCT1332L1ZZ')
  })
  it('rejects a malformed GSTIN', () => {
    expect(OrgDetailsSchema.safeParse({ ...base, gstin: '07AABCT1332L1Z' }).success).toBe(false)
  })
})

describe('AffiliateSettingsSchema', () => {
  const base = { creatorCommissionPct: '10', bookingMode: 'platform', redirectUrl: '', leadFeeOn: false, leadFeeRupees: '0', leadFeeMonthlyCap: '0' } as const
  it('accepts TripLink checkout without a URL', () => {
    expect(AffiliateSettingsSchema.safeParse(base).success).toBe(true)
  })
  it('requires an https URL for redirect mode', () => {
    expect(AffiliateSettingsSchema.safeParse({ ...base, bookingMode: 'redirect' }).success).toBe(false)
    expect(AffiliateSettingsSchema.safeParse({ ...base, bookingMode: 'redirect', redirectUrl: 'http://td.in/x' }).success).toBe(false)
    expect(AffiliateSettingsSchema.safeParse({ ...base, bookingMode: 'redirect', redirectUrl: 'https://td.in/x' }).success).toBe(true)
  })
  it('bounds the lead fee', () => {
    expect(AffiliateSettingsSchema.safeParse({ ...base, leadFeeOn: true, leadFeeRupees: '20' }).success).toBe(false)
    expect(AffiliateSettingsSchema.safeParse({ ...base, leadFeeOn: true, leadFeeRupees: '1500' }).success).toBe(false)
    expect(AffiliateSettingsSchema.safeParse({ ...base, leadFeeOn: true, leadFeeRupees: '200' }).success).toBe(true)
  })
})
