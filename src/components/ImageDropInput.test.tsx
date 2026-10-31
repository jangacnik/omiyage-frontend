import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { ImageDropInput } from './ImageDropInput'

function dropFile(target: Element, file: File) {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as unknown as DragEvent
  Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } })
  target.dispatchEvent(event)
}

const IMAGES_URL = 'http://localhost:8081/api/images'

describe('ImageDropInput', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uploads a file dropped onto the dropzone', async () => {
    server.use(
      http.post('http://localhost:8081/api/images', () => HttpResponse.json({ key: 'uploaded-key-1' })),
    )
    const onUploaded = vi.fn()
    render(<ImageDropInput label="Add photo" onUploaded={onUploaded} />)

    const dropzone = screen.getByRole('group', { name: /Add photo/ })
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    dropFile(dropzone, file)

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('uploaded-key-1'))
  })

  it('ignores a drop while disabled', () => {
    const onUploaded = vi.fn()
    render(<ImageDropInput label="Add photo" disabled onUploaded={onUploaded} />)

    const dropzone = screen.getByRole('group', { name: /Add photo/ })
    dropFile(dropzone, new File(['data'], 'photo.png', { type: 'image/png' }))

    expect(onUploaded).not.toHaveBeenCalled()
  })
  it('uploads a file picked through the file input and reports uploading state', async () => {
    const user = userEvent.setup()
    server.use(http.post(IMAGES_URL, () => HttpResponse.json({ key: 'picked-key' })))
    const onUploaded = vi.fn()
    const onUploadingChange = vi.fn()
    const { container } = render(<ImageDropInput onUploaded={onUploaded} onUploadingChange={onUploadingChange} />)

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, new File(['d'], 'a.png', { type: 'image/png' }))

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('picked-key'))
    expect(onUploadingChange.mock.calls).toEqual([[true], [false]])
    expect(screen.getByAltText('Selected preview')).toHaveAttribute('src', 'blob:preview')
    expect(screen.getByText('Replace file')).toBeInTheDocument()
  })

  it('uploads an image pasted into the dropzone', async () => {
    server.use(http.post(IMAGES_URL, () => HttpResponse.json({ key: 'pasted-key' })))
    const onUploaded = vi.fn()
    render(<ImageDropInput label="Add photo" onUploaded={onUploaded} />)

    const file = new File(['d'], 'p.png', { type: 'image/png' })
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: { items: [{ type: 'text/plain', getAsFile: () => null }, { type: 'image/png', getAsFile: () => file }] } })
    screen.getByRole('group', { name: /Add photo/ }).dispatchEvent(event)

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('pasted-key'))
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores pasted content that is not an image', () => {
    const onUploaded = vi.fn()
    render(<ImageDropInput label="Add photo" onUploaded={onUploaded} />)

    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: { items: [{ type: 'text/plain', getAsFile: () => null }] } })
    screen.getByRole('group', { name: /Add photo/ }).dispatchEvent(event)

    expect(onUploaded).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores dropped files that are not images', () => {
    const onUploaded = vi.fn()
    render(<ImageDropInput label="Add photo" onUploaded={onUploaded} />)

    dropFile(screen.getByRole('group', { name: /Add photo/ }), new File(['d'], 'notes.txt', { type: 'text/plain' }))

    expect(onUploaded).not.toHaveBeenCalled()
  })

  it('shows an error, clears the preview and reports undefined when the upload fails', async () => {
    const user = userEvent.setup()
    server.use(http.post(IMAGES_URL, () => HttpResponse.json({}, { status: 500 })))
    const onUploaded = vi.fn()
    const { container } = render(<ImageDropInput onUploaded={onUploaded} />)

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, new File(['d'], 'a.png', { type: 'image/png' }))

    expect(await screen.findByText('Upload failed — try again.')).toBeInTheDocument()
    expect(onUploaded).toHaveBeenCalledWith(undefined)
    expect(screen.queryByAltText('Selected preview')).not.toBeInTheDocument()
  })

  it('removes an existing photo and reports undefined', async () => {
    const user = userEvent.setup()
    const onUploaded = vi.fn()
    render(<ImageDropInput initialImageKey="existing-key" onUploaded={onUploaded} />)

    expect(screen.getByAltText('Selected preview')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Remove photo'))

    expect(onUploaded).toHaveBeenCalledWith(undefined)
    expect(screen.queryByAltText('Selected preview')).not.toBeInTheDocument()
    expect(screen.getByText('Choose file')).toBeInTheDocument()
  })
})
