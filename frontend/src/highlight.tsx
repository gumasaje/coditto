import { ReactNode } from 'react'

const KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
  'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
  'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
  'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public',
  'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
  'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'true', 'false',
  'null', 'var', 'record', 'sealed', 'permits', 'yield',
])

const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|(@[A-Za-z_]\w*)|(\b\d[\d_]*\.?\d*[fFdDlL]?\b)|(\b[A-Za-z_]\w*\b)|(\s+)|(.)/g

function kind(groups: Array<string | undefined>): string {
  if (groups[1]) return 'comment'
  if (groups[2]) return 'string'
  if (groups[3]) return 'annotation'
  if (groups[4]) return 'number'
  if (groups[5]) return KEYWORDS.has(groups[5]) ? 'keyword' : /^[A-Z]/.test(groups[5]) ? 'type' : 'plain'
  return 'plain'
}

export function highlightSource(source: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = new RegExp(TOKEN.source, TOKEN.flags)
  let match: RegExpExecArray | null
  let index = 0
  while ((match = pattern.exec(source)) !== null) {
    const token = match[0]
    const tokenKind = kind(Array.from(match))
    nodes.push(
      <span key={index} className={tokenKind === 'plain' ? undefined : `tok-${tokenKind}`}>
        {token}
      </span>,
    )
    index += 1
  }
  return nodes
}
