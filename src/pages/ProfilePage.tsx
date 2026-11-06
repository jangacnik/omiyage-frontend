import { ErrorState } from '../components/ErrorState'
import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
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
      <p className="mb-4 flex items-center gap-2 text-muted">
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

const DISCORD_NAME_MAX = 32

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
  discordName: z.string().max(DISCORD_NAME_MAX, `At most ${DISCORD_NAME_MAX} characters`).optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { data: profile, isLoading, isError, refetch, isRefetching } = useMyProfile()
  const updateProfile = useUpdateProfile()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) })
  const discordName = useWatch({ control, name: 'discordName' })

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
        discordName: profile.discordName ?? '',
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
      discordName: data.discordName?.trim() || undefined,
    })
  }

  if (isLoading) return <Spinner fullPage label="Fetching profile" />
  if (isError) return <ErrorState message="Could not load your profile." onRetry={() => refetch()} isRetrying={isRefetching} />

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-1">Profile</h1>
      {profile && <AvatarEditor profile={profile} />}
      {profile && <NicknameEditor profile={profile} />}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email" error={errors.email?.message}>
          <input className="field-input" type="email" autoComplete="email" {...register('email')} />
        </Field>

        <Field label="Phone">
          <input className="field-input" type="tel" autoComplete="tel" {...register('phone')} />
        </Field>

        <Field label="First name">
          <input className="field-input" autoComplete="given-name" {...register('firstName')} />
        </Field>

        <Field label="Last name">
          <input className="field-input" autoComplete="family-name" {...register('lastName')} />
        </Field>

        <Field label="Address line 1" className="sm:col-span-2">
          <input className="field-input" autoComplete="address-line1" {...register('addressLine1')} />
        </Field>

        <Field label="Address line 2" className="sm:col-span-2">
          <input className="field-input" autoComplete="address-line2" {...register('addressLine2')} />
        </Field>

        <Field label="Postal code">
          <input className="field-input" autoComplete="postal-code" {...register('postalCode')} />
        </Field>

        <Field label="City">
          <input className="field-input" autoComplete="address-level2" {...register('city')} />
        </Field>

        <Field label="Country" className="sm:col-span-2">
          <input className="field-input" autoComplete="country-name" {...register('country')} />
        </Field>

        <Field
          label="Discord name"
          hint={`Used so the bot can mention you; visible to admins only. ${(discordName ?? '').length}/${DISCORD_NAME_MAX}`}
          error={errors.discordName?.message}
          className="sm:col-span-2"
        >
          <input className="field-input" {...register('discordName')} aria-label="Discord name" />
        </Field>

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
