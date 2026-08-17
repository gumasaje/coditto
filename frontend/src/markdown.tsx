import { Fragment, ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={index} className="rounded-[2px] bg-panel px-1 font-mono text-[0.86em] text-acid">{part.slice(1, -1)}</code>
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

export function StatementMarkdown({ source }: { source: string }) {
  const nodes: ReactNode[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  let index = 0
  let key = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.startsWith('```')) {
      index += 1
      const code: string[] = []
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      nodes.push(
        <pre key={key} className="my-4 overflow-auto border border-line bg-void px-3 py-2 font-mono text-[13px] leading-6 text-ink">
          <code>{code.join('\n')}</code>
        </pre>,
      )
      key += 1
      continue
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h2 key={key} className="mb-4 text-[1.35rem] font-semibold tracking-[-0.03em] text-ink">
          {inline(line.slice(2))}
        </h2>,
      )
      key += 1
      index += 1
      continue
    }
    if (line.trim() === '') {
      index += 1
      continue
    }
    const paragraph: string[] = []
    while (
      index < lines.length
      && lines[index].trim() !== ''
      && !lines[index].startsWith('# ')
      && !lines[index].startsWith('```')
    ) {
      paragraph.push(lines[index])
      index += 1
    }
    nodes.push(
      <p key={key} className="mb-4 text-[15px] leading-7 text-mute">
        {inline(paragraph.join(' '))}
      </p>,
    )
    key += 1
  }

  return <div>{nodes}</div>
}
