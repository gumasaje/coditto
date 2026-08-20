# 첫 배포 가이드 (가비아 VPS)

## 현재 지원 범위

이 저장소는 현재 **비공개 베타 또는 신뢰하는 사용자의 데모** 배포만 지원한다. 제출 API는 사용자가 보낸 Java 코드를 Docker로 실행한다. [Judge 계약](contracts/judge.md)은 현재 Docker 제한만으로 공개 임의 코드 실행에 충분한 격리를 주장하지 않으며, 강한 격리와 production resource policy를 TODO로 남긴다.

따라서 이 가이드는 API와 Judge를 같은 **전용 VPS**에 두는 해커톤 배포안을 다룬다. Docker socket을 쓸 수 있는 `coditto` 계정은 사실상 호스트 고권한이므로, 개인 파일·다른 서비스·중요한 비밀값이 있는 서버와 공유하면 안 된다.

## 구성

```text
Internet
  -> https://coditto.org (Cloudflare Named Tunnel HTTPS endpoint)
       -> outbound cloudflared -> Nginx :443 (React static files; HTTP origin)
            -> /api/* -> Spring Boot :8080 (loopback only)
                 -> Python Runner -> Docker Judge container
```

Nginx가 Frontend와 `/api`를 같은 origin으로 제공하므로 CORS 설정은 필요 없다. Backend 포트 `8080`과 Docker daemon은 외부 방화벽에 열지 않는다.

## 서버 사전 조건

이 문서는 대회에서 제공한 가비아 VPS를 기준으로 작성했다. 아래 사양은 우리가 고른 값이 아니라 **현재 서버의 실제 사양**이며, 동시에 Judge 실행에 필요한 하한이기도 하다.

- Ubuntu 24.04 LTS, 2 vCPU / 3.8 GiB RAM / 96 GiB 디스크
- SSH 키 로그인만 허용하는 sudo 사용자와 공인 IPv4. 제출 URL `coditto.org`은 Cloudflare에 등록한 도메인이며, Named Tunnel public hostname으로 연결한다.
- 목표 상태는 `80/tcp`, `443/tcp`만 공개하고 `22/tcp`는 관리자의 고정 IP만 허용하는 것이다. 현재 해커톤 서버는 아직 그 상태가 아니다. 아래 "현재 방화벽 상태"를 확인한다.
- 사업자가 inbound `80/tcp`를 막는 VPS가 있다. 현재 해커톤 서버가 그 경우이므로 공개 진입점은 `443`이고, 아래 Nginx 설정은 `80`과 `443`을 함께 listen한다.
- Docker Engine, Java 21 runtime, Python 3, Node.js 24, Nginx, `cloudflared` 설치. Certbot은 커스텀 도메인 TLS를 운영할 때만 필요하다.
- Docker를 실행하는 전용 `coditto` Linux 계정. 이 계정을 `docker` group에 넣는 것은 root 권한에 준하는 접근을 준다는 것을 이해해야 한다.

Judge 하나가 CPU 2개와 768 MiB를 사용한다. 현재 Backend에는 전역 대기열이나 동시 실행 제한이 없으므로 작은 서버에서 공개 제출을 켜면 자원 고갈을 막을 수 없다. Nginx의 IP별 제한은 첫 방어선일 뿐 충분한 운영 제어가 아니다.

## 현재 방화벽 상태

해커톤 서버에는 아직 호스트 방화벽이 없다. `ufw`는 `inactive`이고 `iptables`의 `INPUT` 정책은 룰 없이 `ACCEPT`다. 외부 노출을 실제로 제한하는 것은 사업자 네트워크 필터뿐이다. 이 상태를 그대로 두기로 한 근거와 남은 위험은 다음과 같다.

- 외부에서 접속되는 포트는 `22`와 `443`뿐이다. `80`과 `8080`은 사업자 구간에서 차단된다.
- Backend는 loopback에만 bind하므로 API가 방화벽 없이도 직접 노출되지 않는다. 즉 지금 `ufw`를 켜도 실제로 차단되는 트래픽은 없다.
- 반대로 새 서비스를 wildcard 주소로 띄우면 방화벽이 막아 주지 않는다. 임시 개발 서버나 데이터베이스를 이 서버에서 열지 않는다.

`ufw`를 켤 때는 두 가지를 먼저 이해해야 한다.

- `22`를 허용하기 전에 활성화하면 SSH 접속을 잃는다. 콘솔 접근 수단을 확인하고, 다른 SSH 세션을 열어 둔 채로 적용한다.
- Docker가 publish한 포트는 `DOCKER-USER`와 `FORWARD` 경로를 타므로 `ufw`의 `INPUT` 규칙을 우회한다. `ufw` 활성화만으로 container 포트가 보호된다고 가정하면 안 된다. 현재 publish된 container 포트는 없다.

## 최초 설치

아래 예시는 `/srv/coditto/current`에 release checkout을 두는 방식이다. 실제 release를 바꿀 때도 그 경로가 항상 완전한 checkout을 가리키도록 유지한다.

```bash
sudo adduser --system --group --home /srv/coditto coditto
sudo usermod -aG docker coditto
sudo install -d -o coditto -g coditto -m 0750 /srv/coditto
sudo -u coditto git clone https://github.com/gumasaje/coditto.git /srv/coditto/current
sudo chmod 0750 /srv/coditto/current

cd /srv/coditto/current/backend
./gradlew bootJar
cp build/libs/coditto-backend-0.0.1-SNAPSHOT.jar build/libs/coditto-backend.jar

cd ../frontend
npm ci
npm run build
```

`git clone`은 umask에 따라 world-readable 트리를 만들 수 있다. 릴리스 트리에는 `judge-only/` 공식 test가 들어 있으므로 `0750`으로 맞춰 서비스 계정과 Nginx group만 읽게 한다.

Node.js는 Frontend build 단계에만 필요하다. 정적 `frontend/dist`를 Nginx가 직접 제공하므로 런타임 Node 서버는 띄우지 않는다.

Node 버전은 `frontend/.nvmrc`와 `frontend/package.json`의 `engines`가 고정하며 현재 24다. Node 20에서는 `jsdom`이 끌어오는 `undici`가 `worker_threads.markAsUncloneable`을 요구해 `npm test`의 vitest worker가 기동하지 못한다. 빌드는 20에서도 통과하므로 이 증상은 아래 "배포 전 검증"을 조용히 건너뛰게 만든다. 서버 Node를 올릴 때는 NodeSource 저장소를 해당 major로 바꾼 뒤 `nodejs`를 다시 설치한다.

```bash
sudo sed -i 's|node_20.x|node_24.x|' /etc/apt/sources.list.d/nodesource.sources
sudo apt-get update
sudo apt-get install -y --allow-downgrades nodejs
node -v
```

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

`CODITTO_RUNNER_TIMEOUT`은 API가 Runner process를 기다리는 상한이며, Judge container 자체의 실행 상한이 아니다. container 상한은 Runner가 소유하고 [기술 아키텍처](ARCHITECTURE.md)에 기록한 60초이며, 두 값의 차이는 Runner가 판정을 정규화하고 container를 정리할 여유로 남긴다. 그래서 API가 먼저 포기하면 `TIMED_OUT`이 아니라 `SYSTEM_FAILED`가 되므로 `CODITTO_RUNNER_TIMEOUT`을 60초 이하로 낮추지 않는다.

`/etc/coditto/backend.env`의 `CODITTO_PROBLEMS_ROOT_PATH`와 `CODITTO_RUNNER_SCRIPT_PATH`는 반드시 절대 경로여야 한다. `OPENAI_API_KEY`는 선택 사항이며, 없으면 면접 질문 기능만 `UNAVAILABLE`이 되고 Judge는 계속 동작한다.

Windows 로컬에서 `python3` 실행 파일이 없으면 `CODITTO_RUNNER_PYTHON_COMMAND=python`을 지정한다. `coditto.runner.python-command` 기본값은 `python3`이며, OS별로 바꾸지 않고 이 설정값을 그대로 사용한다.

서비스는 candidate 임시 파일을 `/run/coditto`에 만든다. Docker daemon이 그 경로를 bind-mount해서 Judge에 전달해야 하므로 systemd `PrivateTmp=true`를 사용하면 안 된다.

## Nginx HTTP origin과 공인 IP fallback

이 설정은 Nginx origin을 공인 IP에도 열 수 있게 한다. 현재 서버는 inbound `80/tcp`가 닿지 않으므로 direct fallback은 포트를 포함한 `http://<공인-IP>:443`이다. 이 경로는 평문 HTTP라 `https://<공인-IP>`는 동작하지 않는다. 해커톤 제출 URL은 아래 Named Tunnel의 `https://coditto.org`을 사용한다. 설정은 dedicated VPS의 모든 HTTP host를 받도록 `default_server`와 `server_name _`를 사용한다. 다른 사이트를 같은 VPS에서 운영한다면 이 설정을 그대로 사용하지 말고 별도 virtual host를 구성한다.

`/api/submissions`는 Judge를 실행하는 공개 endpoint다. Nginx는 IP당 분당 5회, burst 2회와 동시 연결 2개로 제한하지만, 이는 운영 기본선일 뿐 사용자별 quota·전역 queue·강한 격리를 대체하지 않는다. 제한을 넘긴 요청은 `429`와 `{"error":{"kind":"RATE_LIMITED"}}`를 받는다.

```bash
sudo install -m 0644 /srv/coditto/current/deploy/nginx/coditto.conf \
  /etc/nginx/sites-available/coditto
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/coditto /etc/nginx/sites-enabled/coditto
sudo usermod -aG coditto www-data
sudo nginx -t
sudo systemctl restart nginx

curl --fail http://<공인-IP>:443/api/problems
```

## Cloudflare Named Tunnel HTTPS 공개

제출 URL을 고정하려면 Cloudflare Named Tunnel을 Nginx origin 앞에 둔다. Browser와 Cloudflare edge 사이의 HTTPS는 Cloudflare가 종료하고, `cloudflared`는 서버에서 outbound connection으로 `http://127.0.0.1:443` Nginx origin에 연결한다. 따라서 inbound `80/tcp`가 열려 있지 않아도 된다.

Cloudflare dashboard에서 **Networking -> Tunnels -> Create a tunnel**을 선택해 `coditto` Named Tunnel을 만든다. Connector 설치 단계에서 Linux용 token을 발급받고, **Public Hostname**을 다음처럼 설정한다.

```text
Hostname: coditto.org
Service type: HTTP
URL: http://127.0.0.1:443
```

Cloudflare가 `coditto.org` zone을 직접 관리하므로 public hostname 저장 시 필요한 DNS route도 함께 만든다. 별도 A/AAAA 레코드를 만들지 않는다. 터널 token은 secret이므로 저장소·Issue·PR·채팅에 기록하지 않는다.

```bash
sudo install -d -m 0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
sudo apt-get update
sudo apt-get install -y cloudflared

curl --fail http://127.0.0.1:443/api/problems
sudo cloudflared service install <TUNNEL_TOKEN>
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
```

`<TUNNEL_TOKEN>`은 dashboard Connector 설치 단계에서 발급받은 값으로 대체한다. `cloudflared` systemd service는 VPS 재부팅 뒤에도 같은 Named Tunnel로 재연결한다. tunnel 자체를 삭제하거나 public hostname/DNS route를 지우지 않는 한 제출 URL `https://coditto.org`은 바뀌지 않는다.

외부에서 확인한다.

```bash
curl --fail https://coditto.org/api/problems
```

Named Tunnel이 연결되지 않으면 VPS에서 `sudo systemctl status cloudflared --no-pager`와 `sudo journalctl -u cloudflared -n 100 --no-pager`로 확인한다. 기존 Quick Tunnel은 Named Tunnel의 외부 확인이 끝난 뒤에만 `pgrep -af 'cloudflared tunnel --url http://127.0.0.1:443'`로 PID를 확인하고 해당 PID만 종료한다. `pkill cloudflared`로 임의 종료하지 않는다.

## Nginx 직접 TLS는 향후 선택 사항

현재 제출 구성은 `coditto.org`과 Cloudflare Named Tunnel이 HTTPS를 종료하므로 Certbot을 실행하지 않는다. 다음 절차는 Cloudflare Tunnel을 제거하고 Nginx가 직접 도메인 TLS를 종료하는 별도 운영 전환 때만 사용한다.

```bash
sudoedit /etc/nginx/sites-available/coditto
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d example.com
```

Certbot을 실행하기 전에 `deploy/nginx/coditto.conf`의 평문 `listen 443`을 제거한다. 남겨 두면 Certbot이 추가하는 TLS listener와 같은 포트에서 충돌한다. TLS 적용 후에는 Certbot이 만드는 HTTP -> HTTPS redirect와 certificate 설정을 유지한다.

## 배포 전 검증

release마다 다음을 실제로 실행한다.

```bash
cd /srv/coditto/current
python3 -m unittest discover -s judge-runner/tests -v
python3 judge-runner/verify_spike.py --skip-image-build
python3 judge-runner/verify_pbl_problems.py --skip-image-build

cd backend && ./gradlew test
cd ../frontend && npm test && npm run build
cd .. && git diff --check

curl --fail http://127.0.0.1:8080/api/problems
curl --fail http://<공인-IP>:443/api/problems
curl --fail https://coditto.org/api/problems
```

`verify_pbl_problems.py`는 66개의 실제 Judge 실행을 수행하므로 서버 사양이 작으면 오래 걸릴 수 있다. 문제 이미지 또는 Runner 격리 정책이 바뀌었을 때는 생략하지 않는다.

배포 서버에서는 두 검증 스크립트 모두 `--skip-image-build`를 사용한다. 이 옵션이 없으면 스크립트가 Judge image를 같은 tag로 다시 빌드해, 지금 제출을 처리하고 있는 image를 교체한다. 위 설치 절차의 `build-judge-images.sh`가 이미 두 image를 빌드하므로 검증 단계에서 다시 빌드할 이유가 없다. 개발 머신에서 image 빌드 자체를 검증할 때만 옵션 없이 실행한다.

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
- 호스트 방화벽 활성화와 `22/tcp`의 관리자 고정 IP 제한
