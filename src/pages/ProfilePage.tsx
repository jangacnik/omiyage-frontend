import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useChangeMyPassword, useMyProfile, useUpdateMyNickname, useUpdateProfile } from '../api/profile'
import { ApiError } from '../lib/apiClient'
import { Avatar } from '../components/Avatar'
import { Field } from '../components/Field'
import { ImageDropInput } from '../components/ImageDropInput'
import { ButtonSpinner, Spinner } from '../components/Spinner'
import { IconButton } from '../components/IconButton'
import { CheckIcon, CloseIcon, EditIcon } from '../components/icons'
import type { UserProfileDto } from '../types/api'

function AvatarEditor({ profile }: { profile: UserProfileDto }) {
  const updateProfile = useUpdateProfile()

  return (
    <div className="mb-4 flex items-center gap-3">
      <Avatar imageKey={profile.avatarKey} nickname={profile.nickname} size="lg" />
      <ImageDropInput
        label="Avatar"
        initialImageKey={profile.avatarKey ?? undefined}
        onUploaded={(key) => updateProfile.mutate({ avatarKey: key ?? null })}
      />
      {updateProfile.isError && <p className="error-text">Could not save avatar.</p>}
    </div>
  )
}

function NicknameEditor({ profile }: { profile: UserProfileDto }) {
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(profile.nickname ?? '')
  const updateNickname = useUpdateMyNickname()

  function save() {
    if (!nickname.trim()) return
    updateNickname.mutate(nickname.trim(), { onSuccess: () => setEditing(false) })
  }

  if (!editing) {
    return (
      <p className="mb-4 flex items-center gap-2 text-ink/60">
        <span>Nickname: {profile.nickname}</span>
        <IconButton label="Rename" onClick={() => setEditing(true)} icon={<EditIcon size={14} />} />
      </p>
    )
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <Field label="Nickname" className="w-full sm:w-64">
        <input
          className="field-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          aria-label="Nickname"
          autoFocus
        />
      </Field>
      <IconButton
        variant="primary"
        label="Save nickname"
        onClick={save}
        disabled={updateNickname.isPending}
        icon={updateNickname.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
      />
      <IconButton
        label="Cancel"
        onClick={() => {
          setNickname(profile.nickname ?? '')
          setEditing(false)
        }}
        icon={<CloseIcon size={14} />}
      />
      {updateNickname.isError && (
        <p className="error-text w-full">
          {updateNickname.error instanceof ApiError && updateNickname.error.status === 409
            ? 'That nickname is already taken.'
            : 'Could not save nickname.'}
        </p>
      )}
    </div>
  )
}

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type PasswordForm = z.infer<typeof passwordSchema>

function ChangePasswordForm() {
  const changePassword = useChangeMyPassword()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  function onSubmit(data: PasswordForm) {
    changePassword.mutate(
      { oldPassword: data.oldPassword, newPassword: data.newPassword },
      { onSuccess: () => reset() },
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card mt-4 flex flex-col gap-3">
      <h2 className="font-medium text-ink">Change password</h2>
      <div className="flex flex-col gap-1">
        <label htmlFor="oldPassword" className="field-label">
          Current password
        </label>
        <input id="oldPassword" type="password" className="field-input" {...register('oldPassword')} aria-label="Current password" />
        {errors.oldPassword && <p className="error-text">{errors.oldPassword.message}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="newPassword" className="field-label">
          New password
        </label>
        <input id="newPassword" type="password" className="field-input" {...register('newPassword')} aria-label="New password" />
        {errors.newPassword && <p className="error-text">{errors.newPassword.message}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="field-label">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          className="field-input"
          {...register('confirmPassword')}
          aria-label="Confirm new password"
        />
        {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
      </div>
      <button type="submit" className="btn-primary self-start" disabled={changePassword.isPending}>
        {changePassword.isPending ? <ButtonSpinner /> : 'Change password'}
      </button>
      {changePassword.isSuccess && <p className="text-sm font-medium text-forest">Password changed.</p>}
      {changePassword.isError && (
        <p className="error-text">
          {changePassword.error instanceof ApiError && changePassword.error.status === 401
            ? 'Current password is incorrect.'
            : 'Could not change password.'}
        </p>
      )}
    </form>
  )
}

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
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-1">Profile</h1>
      {profile && <AvatarEditor profile={profile} />}
      {profile && <NicknameEditor profile={profile} />}

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
          {updateProfile.isSuccess && <p className="text-sm font-medium text-forest">Saved.</p>}
          {updateProfile.isError && <p className="error-text">Could not save profile.</p>}
        </div>
      </form>

      <ChangePasswordForm />
    </div>
  )
}
