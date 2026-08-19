# 첫 배포 가이드 (가비아 VPS)

## 현재 지원 범위

이 저장소는 현재 **비공개 베타 또는 신뢰하는 사용자의 데모** 배포만 지원한다. 제출 API는 사용자가 보낸 Java 코드를 Docker로 실행한다. [Judge 계약](contracts/judge.md)은 현재 Docker 제한만으로 공개 임의 코드 실행에 충분한 격리를 주장하지 않으며, 강한 격리와 production resource policy를 TODO로 남긴다.

따라서 이 가이드는 API와 Judge를 같은 **전용 VPS**에 두는 해커톤 배포안을 다룬다. Docker socket을 쓸 수 있는 `coditto` 계정은 사실상 호스트 고권한이므로, 개인 파일·다른 서비스·중요한 비밀값이 있는 서버와 공유하면 안 된다.

## 구성

```text
Internet
  -> Nginx :443 (TLS, React static files)
       -> /api/* -> Spring Boot :8080 (loopback only)
                        -> Python Runner -> Docker Judge container
```

Nginx가 Frontend와 `/api`를 같은 origin으로 제공하므로 CORS 설정은 필요 없다. Backend 포트 `8080`과 Docker daemon은 외부 방화벽에 열지 않는다.

## 서버 사전 조건

- Ubuntu 24.04 LTS 같은 지원 중인 Linux VPS, 최소 2 vCPU / 4 GiB RAM / 40 GiB 디스크
- SSH 키 로그인만 허용하는 sudo 사용자와 공인 IPv4. 도메인 A/AAAA 레코드는 HTTPS 공개 전에 필요하다.
- `80/tcp`, `443/tcp`만 공개하고 `22/tcp`는 관리자의 고정 IP만 허용
- Docker Engine, Java 21 runtime, Python 3, Nginx, Certbot 설치
- Docker를 실행하는 전용 `coditto` Linux 계정. 이 계정을 `docker` group에 넣는 것은 root 권한에 준하는 접근을 준다는 것을 이해해야 한다.

Judge 하나가 CPU 1개와 768 MiB를 사용한다. 현재 Backend에는 전역 대기열이나 동시 실행 제한이 없으므로 작은 서버에서 공개 제출을 켜면 자원 고갈을 막을 수 없다. Nginx의 IP별 제한은 첫 방어선일 뿐 충분한 운영 제어가 아니다.

## 최초 설치

아래 예시는 `/srv/coditto/current`에 release checkout을 두는 방식이다. 실제 release를 바꿀 때도 그 경로가 항상 완전한 checkout을 가리키도록 유지한다.

```bash
sudo adduser --system --group --home /srv/coditto coditto
sudo usermod -aG docker coditto
sudo install -d -o coditto -g coditto -m 0750 /srv/coditto
sudo -u coditto git clone https://github.com/gumasaje/coditto.git /srv/coditto/current

cd /srv/coditto/current/backend
./gradlew bootJar
cp build/libs/coditto-backend-0.0.1-SNAPSHOT.jar build/libs/coditto-backend.jar

cd ../frontend
npm ci
npm run build
```

Node.js는 Frontend build 단계에만 필요하다. 정적 `frontend/dist`를 Nginx가 직접 제공하므로 런타임 Node 서버는 띄우지 않는다.

Judge 이미지는 제출을 받기 전에 한 번 빌드한다. Runner가 실행 시 `--pull never`를 사용하므로 manifest가 참조하는 이미지가 서버에 없으면 제출은 실패한다.

```bash
cd /srv/coditto/current
sudo ./deploy/scripts/build-judge-images.sh
```

이미지 태그는 현재 모든 `problems/*/v1/manifest.yaml`과 일치해야 한다. 새 문제나 의존성을 추가한 release는 해당 Judge image를 다시 빌드하고 실제 Docker 검증을 거친 뒤 배포한다.

## Backend 서비스 설정

```bash
sudo install -d -m 0750 /etc/coditto
sudo install -m 0640 -o root -g coditto \
  /srv/coditto/current/deploy/environment/coditto-backend.env.example \
  /etc/coditto/backend.env
sudoedit /etc/coditto/backend.env

sudo install -m 0644 /srv/coditto/current/deploy/systemd/coditto-backend.service \
  /etc/systemd/system/coditto-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now coditto-backend
sudo systemctl status coditto-backend
```

`/etc/coditto/backend.env`의 `CODITTO_PROBLEMS_ROOT_PATH`와 `CODITTO_RUNNER_SCRIPT_PATH`는 반드시 절대 경로여야 한다. `OPENAI_API_KEY`는 선택 사항이며, 없으면 면접 질문 기능만 `UNAVAILABLE`이 되고 Judge는 계속 동작한다.

서비스는 candidate 임시 파일을 `/run/coditto`에 만든다. Docker daemon이 그 경로를 bind-mount해서 Judge에 전달해야 하므로 systemd `PrivateTmp=true`를 사용하면 안 된다.

## 공인 IP 임시 공개

도메인이 아직 없을 때는 이 설정으로 `http://<공인-IP>`에 Frontend와 모든 API를 공개할 수 있다. 해커톤 제출 URL은 이 HTTP 주소를 사용한다. 설정은 dedicated VPS의 모든 HTTP host를 받도록 `default_server`와 `server_name _`를 사용한다. 다른 사이트를 같은 VPS에서 운영한다면 이 설정을 그대로 사용하지 말고 별도 virtual host를 구성한다.

`/api/submissions`는 Judge를 실행하는 공개 endpoint다. Nginx는 IP당 분당 5회, burst 2회와 동시 연결 2개로 제한하지만, 이는 운영 기본선일 뿐 사용자별 quota·전역 queue·강한 격리를 대체하지 않는다.

```bash
sudo install -m 0644 /srv/coditto/current/deploy/nginx/coditto.conf \
  /etc/nginx/sites-available/coditto
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/coditto /etc/nginx/sites-enabled/coditto
sudo nginx -t
sudo systemctl reload nginx

curl --fail http://<공인-IP>/api/problems
```

## 도메인과 TLS

도메인을 배정받거나 구매한 뒤에는 `deploy/nginx/coditto.conf`를 실제 도메인 virtual host로 바꾼다. `server_name`을 실제 도메인으로 지정하고 `default_server`를 제거한 뒤 Certbot을 실행한다.

```bash
sudoedit /etc/nginx/sites-available/coditto
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d example.com
```

TLS 적용 후에는 Certbot이 만드는 HTTP -> HTTPS redirect와 certificate 설정을 유지한다.

## 배포 전 검증

release마다 다음을 실제로 실행한다.

```bash
cd /srv/coditto/current
python3 -m unittest discover -s judge-runner/tests -v
python3 judge-runner/verify_spike.py
python3 judge-runner/verify_pbl_problems.py

cd backend && ./gradlew test
cd ../frontend && npm test && npm run build
cd .. && git diff --check

curl --fail http://127.0.0.1:8080/api/problems
curl --fail http://<공인-IP>/api/problems
```

`verify_pbl_problems.py`는 66개의 실제 Judge 실행을 수행하므로 서버 사양이 작으면 오래 걸릴 수 있다. 문제 이미지 또는 Runner 격리 정책이 바뀌었을 때는 생략하지 않는다.

## 업데이트와 롤백

1. 새 release checkout에서 Backend와 Frontend를 빌드한다.
2. manifest가 바뀌었으면 Judge 이미지를 빌드하고 관련 Docker 검증을 수행한다.
3. `/srv/coditto/current`을 새로 검증한 release로 교체한 뒤 `sudo systemctl restart coditto-backend`를 실행한다.
4. `systemctl status`, `journalctl -u coditto-backend`, `curl /api/problems`, 브라우저 제출을 확인한다.
5. 장애면 `current`을 이전 검증 release로 되돌리고 Backend를 재시작한다.

release 교체는 기존 경로를 부분 수정하지 말고, 완전한 새 checkout을 준비한 뒤 원자적으로 바꾸는 방식으로 운영한다. 이 문서의 symlink 운영 절차는 아직 자동화하지 않았으므로, 실제 전환 스크립트를 추가하기 전에는 점검 창에서 수동으로 수행한다.

## 공개 전 완료해야 할 항목

- Backend 수준의 인증·권한과 사용자별 제출 quota
- 전역 동시 Judge 수 제한과 대기열, overload 응답
- API/Judge 메트릭, 로그 보존 정책, 디스크·컨테이너·메모리 알림
- digest로 고정한 Judge image와 재현 가능한 image publication
- API 서버와 더 강하게 격리된 Judge 실행 환경 분리
- production-only 문제팩과 비밀 테스트의 배포 방식
