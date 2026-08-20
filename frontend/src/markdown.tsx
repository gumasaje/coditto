import { Fragment, ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={index}>{part.slice(1, -1)}</code>
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

/** 문단 하나 분량의 인라인 마크다운. 지금은 백틱 코드만 다룬다. */
export function InlineMarkdown({ source }: { source: string }) {
  return <>{inline(source)}</>
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
        <pre key={key}>
          <code>{code.join('\n')}</code>
        </pre>,
      )
      key += 1
      continue
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h2 key={key}>
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
      <p key={key}>
        {inline(paragraph.join(' '))}
      </p>,
    )
    key += 1
  }

  return <div>{nodes}</div>
}
