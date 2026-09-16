import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { ImageGallery } from './ImageGallery'

function dropFile(target: Element, file: File) {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as unknown as DragEvent
  Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } })
  target.dispatchEvent(event)
}

function Wrapper({ initial }: { initial: string[] }) {
  const [images, setImages] = useState(initial)
  return <ImageGallery images={images} onChange={setImages} />
}

describe('ImageGallery', () => {
  it('shows the current count out of the 5-image cap', () => {
    render(<Wrapper initial={['a', 'b']} />)
    expect(screen.getByText('2/5 photos added.')).toBeInTheDocument()
  })

  it('disables adding more once 5 images are attached', () => {
    render(<Wrapper initial={['a', 'b', 'c', 'd', 'e']} />)
    expect(screen.getByText('5/5 photos added.')).toBeInTheDocument()
    const dropzone = screen.getByRole('group', { name: /Add photo/ })
    expect(dropzone).toHaveAttribute('aria-disabled', 'true')
  })

  it('removing an image re-enables adding', () => {
    render(<Wrapper initial={['a', 'b', 'c', 'd', 'e']} />)
    const removeButtons = screen.getAllByRole('button', { name: 'Remove photo' })
    fireEvent.click(removeButtons[0])
    expect(screen.getByText('4/5 photos added.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Add photo/ })).toHaveAttribute('aria-disabled', 'false')
  })

  it('clears the just-uploaded preview from the add-photo widget once it lands in the thumbnail grid', async () => {
    server.use(http.post('http://localhost:8081/api/images', () => HttpResponse.json({ key: 'uploaded-key-1' })))
    render(<Wrapper initial={[]} />)

    const dropzone = screen.getByRole('group', { name: /Add photo/ })
    dropFile(dropzone, new File(['data'], 'photo.png', { type: 'image/png' }))

    await waitFor(() => expect(screen.getByText('1/5 photos added.')).toBeInTheDocument())
    // The upload preview (with its own "Remove photo" button inside the dropzone) must be gone -
    // only the one remove button for the thumbnail now in the grid above should remain.
    expect(screen.getAllByRole('button', { name: 'Remove photo' })).toHaveLength(1)
  })
})
