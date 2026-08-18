import { InterviewQuestion } from '../types'

/**
 * 통과 뒤에만 붙는 면접 카드. 판정 슬롯과 같은 보더·라임 넘버링을 쓰고, 실패 시 영역을 접는다.
 */
export function InterviewCards({
  status,
  questions,
}: {
  status: 'idle' | 'loading' | 'generated' | 'unavailable'
  questions: InterviewQuestion[]
}) {
  if (status === 'idle' || status === 'unavailable') return null

  return (
    <section aria-label="면접 질문" className="interview">
      <p className="kicker-sm">INTERVIEW</p>
      {status === 'loading' ? (
        <p className="meta">질문을 만드는 중…</p>
      ) : (
        <ol className="interview-list">
          {questions.map((item, index) => (
            <li key={item.question} className="interview-card">
              <p className="interview-num">{String(index + 1).padStart(2, '0')}</p>
              <p className="interview-q">{item.question}</p>
              <p className="interview-why">{item.rationale}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
