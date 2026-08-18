# 읽기 전용 저장소의 쓰기 요청 무시

`MockMemberRepository`는 조회용 더미 데이터를 제공하는 읽기 전용 저장소입니다.
그런데 `save`와 `deleteByName`이 아무 동작 없이 끝나 호출자는 쓰기가 성공했다고
오해할 수 있습니다.

두 쓰기 메서드는 `UnsupportedOperationException`을 던져 요청을 명확히 거부해야
합니다. 저장소의 기존 더미 데이터와 모든 조회 동작은 그대로 보존하세요.

수정 가능한 파일은 `MockMemberRepository.java` 하나뿐입니다.

Java 21과 JUnit 5 기반 공식 테스트로 동작을 검증합니다.
