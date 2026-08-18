# 멤버 삭제 시 연관 과제 처리 누락

멤버를 삭제하면 그 멤버에게 속한 과제도 함께 삭제되어야 합니다. 현재 `Member`의
일대다 연관관계에는 삭제 전파가 없어, 과제가 있는 멤버를 삭제하면 외래 키 제약으로
삭제가 실패합니다.

`Assignment`가 소유한 다대일 관계를 확인하고 `Member`의 연관관계 설정을 수정하세요.
과제가 없는 멤버의 기존 삭제 동작도 보존해야 합니다.

수정 가능한 파일은 다음 하나뿐입니다.

```text
src/main/java/com/likelion/springboot/member/domain/Member.java
```

Java 21, Spring Data JPA와 H2 기반 공식 테스트로 동작을 검증합니다.
