import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMyProfile, useUpdateProfile } from '../api/profile'

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

  if (isLoading) return <p>Loading...</p>

  return (
    <div>
      <h1>Profile</h1>
      <p>Nickname: {profile?.nickname}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <label>
          Email
          <input {...register('email')} aria-label="Email" />
        </label>
        {errors.email && <p>{errors.email.message}</p>}

        <label>
          Phone
          <input {...register('phone')} aria-label="Phone" />
        </label>

        <label>
          Shipping address
          <textarea {...register('shippingAddress')} aria-label="Shipping address" />
        </label>

        <button type="submit" disabled={updateProfile.isPending}>
          Save
        </button>
        {updateProfile.isSuccess && <p>Saved.</p>}
        {updateProfile.isError && <p>Could not save profile.</p>}
      </form>
    </div>
  )
}
