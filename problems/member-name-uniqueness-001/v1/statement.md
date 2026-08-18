# 멤버 이름 변경 중복 검증 누락

멤버 이름은 서로 달라야 합니다. 그런데 `MemberService.rename`으로 이름을 바꾸면
다른 멤버가 이미 사용 중인 이름도 저장되어 중복 멤버가 생깁니다.

동일한 멤버가 현재 이름을 그대로 유지하는 요청은 허용해야 하며, 존재하지 않는
멤버를 변경할 때의 기존 예외도 보존해야 합니다. 제공된 DTO, domain, repository와
예외 타입을 살펴보고 서비스의 이름 변경 로직을 수정하세요.

수정 가능한 파일은 다음 하나뿐입니다.

```text
src/main/java/com/likelion/springboot/member/service/MemberService.java
```

Java 21, Spring Data JPA와 H2 기반 공식 테스트로 동작을 검증합니다.
