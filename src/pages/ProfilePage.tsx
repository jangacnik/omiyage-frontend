import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMyProfile, useUpdateProfile } from '../api/profile'
import { Spinner } from '../components/Spinner'

const profileSchema = z.object({
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  shippingAddress: z.string().optional(),
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
      reset({ email: profile.email ?? '', phone: profile.phone ?? '', shippingAddress: profile.shippingAddress ?? '' })
    }
  }, [profile, reset])

  function onSubmit(data: ProfileForm) {
    updateProfile.mutate({
      email: data.email || undefined,
      phone: data.phone || undefined,
      shippingAddress: data.shippingAddress || undefined,
    })
  }

  if (isLoading) return <Spinner fullPage label="Fetching profile" />

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-1">Profile</h1>
      <p className="mb-4 text-slate-500">Nickname: {profile?.nickname}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-3">
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
          <label htmlFor="shippingAddress" className="field-label">
            Shipping address
          </label>
          <textarea id="shippingAddress" className="field-input" {...register('shippingAddress')} aria-label="Shipping address" />
        </div>

        <button type="submit" className="btn-primary self-start" disabled={updateProfile.isPending}>
          Save
        </button>
        {updateProfile.isSuccess && <p className="text-sm font-medium text-emerald-600">Saved.</p>}
        {updateProfile.isError && <p className="error-text">Could not save profile.</p>}
      </form>
    </div>
  )
}
