/**
 * 파일 트리용 작은 종류 아이콘. 폴더는 폴더, .java는 J 뱃지, 그 외는 문서.
 */
export function FileKindIcon({
  kind = 'file',
  name = '',
}: {
  kind?: 'folder' | 'file'
  name?: string
}) {
  if (kind === 'folder') {
    return (
      <svg className="file-kind-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M2 4.5h4.2l1.2 1.5H14v6.5H2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (name.endsWith('.java')) {
    return <span className="file-kind-java" aria-hidden="true">J</span>
  }

  return (
    <svg className="file-kind-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4 2.5h5.2L12.5 6v7.5H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9.2 2.5V6H12.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
