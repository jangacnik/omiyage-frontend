import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMyProfile, useUpdateProfile } from '../api/profile'
import { Spinner } from '../components/Spinner'

const profileSchema = z.object({
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { data: profile, isLoading } = useMyProfile()
  const updateProfile = useUpdateProfile()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) })

  useEffect(() => {
    if (profile) {
      reset({
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        addressLine1: profile.addressLine1 ?? '',
        addressLine2: profile.addressLine2 ?? '',
        postalCode: profile.postalCode ?? '',
        city: profile.city ?? '',
        country: profile.country ?? '',
      })
    }
  }, [profile, reset])

  function onSubmit(data: ProfileForm) {
    updateProfile.mutate({
      email: data.email || undefined,
      phone: data.phone || undefined,
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
      addressLine1: data.addressLine1 || undefined,
      addressLine2: data.addressLine2 || undefined,
      postalCode: data.postalCode || undefined,
      city: data.city || undefined,
      country: data.country || undefined,
    })
  }

  if (isLoading) return <Spinner fullPage label="Fetching profile" />

  return (
    <div className="max-w-3xl">
      <h1 className="page-title mb-1">Profile</h1>
      <p className="mb-4 text-ink/60">Nickname: {profile?.nickname}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input id="email" className="field-input" {...register('email')} aria-label="Email" />
          {errors.email && <p className="error-text">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="field-label">
            Phone
          </label>
          <input id="phone" className="field-input" {...register('phone')} aria-label="Phone" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="firstName" className="field-label">
            First name
          </label>
          <input id="firstName" className="field-input" {...register('firstName')} aria-label="First name" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="lastName" className="field-label">
            Last name
          </label>
          <input id="lastName" className="field-input" {...register('lastName')} aria-label="Last name" />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="addressLine1" className="field-label">
            Address line 1
          </label>
          <input id="addressLine1" className="field-input" {...register('addressLine1')} aria-label="Address line 1" />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="addressLine2" className="field-label">
            Address line 2
          </label>
          <input id="addressLine2" className="field-input" {...register('addressLine2')} aria-label="Address line 2" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="postalCode" className="field-label">
            Postal code
          </label>
          <input id="postalCode" className="field-input" {...register('postalCode')} aria-label="Postal code" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="city" className="field-label">
            City
          </label>
          <input id="city" className="field-input" {...register('city')} aria-label="City" />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="country" className="field-label">
            Country
          </label>
          <input id="country" className="field-input" {...register('country')} aria-label="Country" />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
          <button type="submit" className="btn-primary self-start" disabled={updateProfile.isPending}>
            Save
          </button>
          {updateProfile.isSuccess && <p className="text-sm font-medium text-bottle">Saved.</p>}
          {updateProfile.isError && <p className="error-text">Could not save profile.</p>}
        </div>
      </form>
    </div>
  )
}
