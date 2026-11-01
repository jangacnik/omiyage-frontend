const URL_PATTERN = /(https?:\/\/[^\s<>]+)/g
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/

function splitTrailingPunctuation(url: string): [string, string] {
  const trailing = url.match(TRAILING_PUNCTUATION)?.[0] ?? ''
  return [url.slice(0, url.length - trailing.length), trailing]
}

export function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_PATTERN).map((part, index) => {
        if (index % 2 === 0) return part
        const [url, trailing] = splitTrailingPunctuation(part)
        return (
          <span key={index}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline break-all">
              {url}
            </a>
            {trailing}
          </span>
        )
      })}
    </>
  )
}
