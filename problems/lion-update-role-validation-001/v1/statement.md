# 아기사자 수정 경로의 역할 검증 누락

아기사자 수정 요청은 `RoleType.LION`인 멤버에게만 적용되어야 합니다. 현재
`MemberService.updateLion`은 ID로 찾은 멤버의 역할을 확인하지 않아 운영진의 공통
정보를 바꾸고 운영진에게 학번까지 저장할 수 있습니다.

운영진이면 상태를 변경하기 전에 `InvalidMemberRequestException`으로 거부하세요.
아기사자 수정과 존재하지 않는 멤버에 대한 기존 예외 동작은 보존해야 합니다.

수정 가능한 파일은 `MemberService.java` 하나뿐입니다.

Java 21, Spring Data JPA와 H2 기반 공식 테스트로 동작을 검증합니다.
