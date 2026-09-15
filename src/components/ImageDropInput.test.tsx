import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { ImageDropInput } from './ImageDropInput'

function dropFile(target: Element, file: File) {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as unknown as DragEvent
  Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } })
  target.dispatchEvent(event)
}

describe('ImageDropInput', () => {
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
})
