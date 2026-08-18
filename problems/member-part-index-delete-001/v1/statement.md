# 멤버 삭제 후 파트 인덱스 동기화 누락

`MemoryMemberRepository`는 전체 멤버 목록과 파트별 멤버 인덱스를 함께 관리합니다.
현재 `deleteByName`은 전체 목록에서만 멤버를 지워 파트별 조회에는 삭제된 멤버가
계속 남습니다.

삭제된 멤버를 두 저장 구조에서 모두 제거하고, 파트에 남은 멤버가 없으면 파트
목록에서도 해당 파트를 제거하세요. 같은 파트의 다른 멤버와 다른 파트의 멤버는
보존해야 합니다.

수정 가능한 파일은 다음 하나뿐입니다.

```text
src/main/java/bonus/MemoryMemberRepository.java
```

Java 21과 JUnit 5 기반 공식 테스트로 동작을 검증합니다.
