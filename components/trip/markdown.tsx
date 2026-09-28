import ReactMarkdown from 'react-markdown'

/**
 * Operator-written trip descriptions. react-markdown never renders raw HTML (no rehype-raw)
 * and its default urlTransform drops javascript:/data: links, so no extra sanitizer is needed.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-sm max-w-none space-y-3 [&_a]:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
      <ReactMarkdown
        skipHtml
        disallowedElements={['img']}
        components={{ a: ({ href, children }) => <a href={href} rel="nofollow noopener" target="_blank">{children}</a> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
