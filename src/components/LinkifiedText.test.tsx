import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkifiedText } from './LinkifiedText'

describe('LinkifiedText', () => {
  it('renders plain text without links', () => {
    render(<p><LinkifiedText text="no links here" /></p>)
    expect(screen.getByText('no links here')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('turns a url into a link that opens in a new tab', () => {
    render(<p><LinkifiedText text="see https://example.com/item?id=1 now" /></p>)
    const link = screen.getByRole('link', { name: 'https://example.com/item?id=1' })
    expect(link).toHaveAttribute('href', 'https://example.com/item?id=1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('keeps trailing punctuation outside the link', () => {
    render(<p><LinkifiedText text="Buy at (https://example.com/a)." /></p>)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/a')
  })

  it('links multiple urls', () => {
    render(<p><LinkifiedText text="http://a.test and https://b.test" /></p>)
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('does not link non-http schemes', () => {
    render(<p><LinkifiedText text="javascript:alert(1) ftp://x.test" /></p>)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
