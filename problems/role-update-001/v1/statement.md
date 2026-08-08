# 역할 변경 승인 버그

`RoleService.updateRole`은 승인된 역할 변경이면 요청한 새 역할을 반환하고, 승인되지
않았으면 기존 역할을 유지해야 합니다. 현재 구현은 승인된 요청도 기존 역할로
되돌려 실제 역할이 바뀌지 않습니다.

수정 가능한 파일은 다음 하나뿐입니다.

```text
src/main/java/com/coditto/demo/RoleService.java
```

Java 21과 제공된 Gradle/JUnit 테스트를 사용해 동작을 수정하세요.
