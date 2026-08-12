# 멤버 수정 시 유효하지 않은 기수가 저장되는 버그

새 멤버를 등록할 때는 기수가 1 이상인지 검증하지만, 기존 Lion 또는 Staff를
수정할 때는 같은 검증을 하지 않습니다. 그 결과 수정 요청에 0이나 음수가 들어오면
유효하지 않은 기수가 데이터베이스에 저장됩니다.

`updateLion`과 `updateStaff` 모두 데이터 조회나 변경 전에 기수를 검증하고, 1보다
작으면 `InvalidMemberRequestException`을 발생시켜야 합니다. 유효한 수정과 기존의
생성·조회 동작은 유지하세요.

수정 가능한 파일은 다음 하나뿐입니다.

```text
src/main/java/com/likelion/springboot/member/service/MemberService.java
```

Java 21, Spring Boot, JPA와 제공된 테스트를 사용해 동작을 수정하세요.
