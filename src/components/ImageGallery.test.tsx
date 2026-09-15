import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ImageGallery } from './ImageGallery'

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
})
