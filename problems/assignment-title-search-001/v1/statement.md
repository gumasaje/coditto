# 과제 제목 부분 검색의 조회 조건 오류

과제 검색은 제목에 검색어가 포함된 모든 과제를 반환해야 합니다. 현재
`AssignmentService.findByTitleContaining`은 정확히 같은 제목만 찾는 repository
메서드를 호출해 `Spring`으로 `Spring 기초`와 `Spring 심화`를 찾지 못합니다.

제공된 repository 계약을 확인해 부분 검색에 맞는 조회 메서드를 사용하세요. 제목
전체가 검색어와 같은 경우와 일치하는 과제가 없는 경우의 기존 동작도 보존해야 합니다.

수정 가능한 파일은 `AssignmentService.java` 하나뿐입니다.

Java 21, Spring Data JPA와 H2 기반 공식 테스트로 동작을 검증합니다.
