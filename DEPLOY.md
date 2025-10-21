# Google Cloud Run 배포 가이드

이 문서는 srh_photo 프로젝트를 Google Cloud Run에 배포하고, GitHub Actions를 통한 자동 배포를 설정하는 방법을 안내합니다.

## 사전 준비

### 1. Google Cloud CLI 설치

```bash
# macOS
brew install google-cloud-sdk

# Windows
# https://cloud.google.com/sdk/docs/install 에서 설치 프로그램 다운로드

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Google Cloud 인증 및 프로젝트 설정

```bash
# Google Cloud 로그인
gcloud auth login

# 프로젝트 설정 (spam 프로젝트 사용)
gcloud config set project spam

# 현재 프로젝트 확인
gcloud config get-value project
```

### 3. 필요한 Google Cloud API 활성화

```bash
# Cloud Run API 활성화
gcloud services enable run.googleapis.com

# Artifact Registry API 활성화 (Docker 이미지 저장소)
gcloud services enable artifactregistry.googleapis.com

# Cloud Build API 활성화
gcloud services enable cloudbuild.googleapis.com
```

### 4. Artifact Registry 저장소 생성

```bash
# Docker 이미지를 저장할 저장소 생성
gcloud artifacts repositories create srh-photo \
    --repository-format=docker \
    --location=asia-northeast3 \
    --description="SRH Photo application"
```

## 로컬에서 Docker 이미지 빌드 및 테스트

```bash
# Docker 이미지 빌드
docker build -t srh-photo:local .

# 로컬에서 테스트 (포트 8080)
docker run -p 8080:8080 srh-photo:local

# 브라우저에서 http://localhost:8080 접속하여 확인
```

## Cloud Run에 수동 배포 (첫 배포)

### 1. Docker 인증 설정

```bash
# Artifact Registry에 대한 Docker 인증
gcloud auth configure-docker asia-northeast3-docker.pkg.dev
```

### 2. 이미지 빌드 및 푸시

```bash
# 프로젝트 ID 확인
PROJECT_ID=$(gcloud config get-value project)

# 이미지 빌드
docker build -t asia-northeast3-docker.pkg.dev/${PROJECT_ID}/srh-photo/app:latest .

# 이미지 푸시
docker push asia-northeast3-docker.pkg.dev/${PROJECT_ID}/srh-photo/app:latest
```

### 3. Cloud Run에 배포

```bash
# Django Secret Key 생성 (안전한 랜덤 문자열)
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Cloud Run 배포
gcloud run deploy srh-photo \
    --image asia-northeast3-docker.pkg.dev/${PROJECT_ID}/srh-photo/app:latest \
    --platform managed \
    --region asia-northeast3 \
    --allow-unauthenticated \
    --set-env-vars "DEBUG=False" \
    --set-env-vars "SECRET_KEY=<위에서 생성한 SECRET_KEY>" \
    --min-instances 0 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300
```

배포가 완료되면 서비스 URL이 표시됩니다 (예: https://srh-photo-xxxxx-an.a.run.app)

### 4. 배포 확인

```bash
# 서비스 URL 확인
gcloud run services describe srh-photo --region=asia-northeast3 --format='value(status.url)'

# 로그 확인
gcloud run services logs read srh-photo --region=asia-northeast3
```

## GitHub Actions 자동 배포 설정

### 1. Workload Identity Federation 설정 (권장 방법)

서비스 계정 키 대신 Workload Identity Federation을 사용하여 더 안전하게 인증합니다.

```bash
# 서비스 계정 생성
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions Service Account"

# 서비스 계정에 필요한 권한 부여
gcloud projects add-iam-policy-binding spam \
    --member="serviceAccount:github-actions@spam.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding spam \
    --member="serviceAccount:github-actions@spam.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding spam \
    --member="serviceAccount:github-actions@spam.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding spam \
    --member="serviceAccount:github-actions@spam.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Workload Identity Pool 생성
gcloud iam workload-identity-pools create "github-pool" \
    --location="global" \
    --display-name="GitHub Actions Pool"

# GitHub Provider 생성
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --location="global" \
    --workload-identity-pool="github-pool" \
    --display-name="GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# 서비스 계정에 Workload Identity 바인딩
gcloud iam service-accounts add-iam-policy-binding \
    github-actions@spam.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/SRHS-SPAM/srh_photo"

# PROJECT_NUMBER 확인
gcloud projects describe spam --format="value(projectNumber)"
```

**중요**: 위 명령어에서 `PROJECT_NUMBER`와 `SRHS-SPAM/srh_photo`를 실제 값으로 변경하세요.

### 2. Workload Identity Provider 정보 확인

```bash
# Workload Identity Provider 전체 리소스 이름 확인
gcloud iam workload-identity-pools providers describe github-provider \
    --location=global \
    --workload-identity-pool=github-pool \
    --format="value(name)"
```

출력 예시:
```
projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

### 3. GitHub Secrets 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 secrets를 추가합니다:

| Secret 이름 | 값 | 설명 |
|------------|-----|------|
| `GCP_PROJECT_ID` | `spam` | Google Cloud 프로젝트 ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` | Workload Identity Provider 전체 경로 |
| `GCP_SERVICE_ACCOUNT` | `github-actions@spam.iam.gserviceaccount.com` | 서비스 계정 이메일 |
| `DJANGO_SECRET_KEY` | `<안전한 랜덤 문자열>` | Django SECRET_KEY |

### 4. 자동 배포 테스트

```bash
# 코드 변경 후 커밋
git add .
git commit -m "Test Cloud Run deployment"
git push origin main
```

또는 PR을 생성하여 main 브랜치에 머지하면 자동으로 배포됩니다.

GitHub Actions 탭에서 배포 진행 상황을 확인할 수 있습니다.

## 환경 변수 관리

배포 후 환경 변수를 업데이트하려면:

```bash
gcloud run services update srh-photo \
    --region asia-northeast3 \
    --set-env-vars "KEY=VALUE"
```

## 로그 및 모니터링

```bash
# 실시간 로그 확인
gcloud run services logs tail srh-photo --region=asia-northeast3

# 최근 로그 확인
gcloud run services logs read srh-photo --region=asia-northeast3 --limit=100

# Cloud Console에서 확인
# https://console.cloud.google.com/run?project=spam
```

## 비용 관리

Cloud Run은 사용한 만큼만 비용이 청구됩니다:

- `--min-instances 0`: 트래픽이 없을 때 인스턴스를 0으로 축소하여 비용 절감
- `--max-instances 10`: 최대 10개 인스턴스까지 확장 가능
- `--memory 512Mi`: 메모리 512MB 할당
- `--cpu 1`: CPU 1개 할당

비용 확인:
```bash
# 서비스 사용 현황 확인
gcloud run services describe srh-photo --region=asia-northeast3
```

## 트러블슈팅

### 배포 실패 시

```bash
# 상세 로그 확인
gcloud run services logs read srh-photo --region=asia-northeast3 --limit=200

# 서비스 상태 확인
gcloud run services describe srh-photo --region=asia-northeast3
```

### Static 파일이 로드되지 않는 경우

Django의 `collectstatic`이 Docker 빌드 중에 실행되는지 확인하세요.

### 데이터베이스 관련 이슈

현재 SQLite를 사용하고 있어 재배포 시 데이터가 손실될 수 있습니다.
프로덕션 환경에서는 Cloud SQL (PostgreSQL) 사용을 권장합니다.

### GitHub Actions 권한 오류

Workload Identity Federation 설정이 올바른지 확인하고, 서비스 계정에 필요한 권한이 모두 부여되었는지 확인하세요.

## Cloud SQL (PostgreSQL) 연결 (선택사항)

프로덕션 환경에서는 Cloud SQL 사용을 권장합니다:

```bash
# Cloud SQL 인스턴스 생성
gcloud sql instances create srh-photo-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=asia-northeast3

# 데이터베이스 생성
gcloud sql databases create photoapp --instance=srh-photo-db

# Cloud Run에서 Cloud SQL 연결
gcloud run services update srh-photo \
    --region asia-northeast3 \
    --add-cloudsql-instances spam:asia-northeast3:srh-photo-db \
    --set-env-vars "DATABASE_URL=postgresql://user:password@/photoapp?host=/cloudsql/spam:asia-northeast3:srh-photo-db"
```

그리고 `requirements.txt`에 `psycopg2-binary` 추가 및 Django settings.py에서 DATABASE 설정 변경이 필요합니다.

## 참고 자료

- [Cloud Run 문서](https://cloud.google.com/run/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions with Google Cloud](https://github.com/google-github-actions/auth)
- [Django on Cloud Run](https://cloud.google.com/python/django/run)
