# GitHub Secrets 설정 가이드

이 파일은 GitHub Actions 자동 배포를 위해 필요한 Secrets 값들을 생성하는 방법을 안내합니다.

## 1단계: Google Cloud 설정 (터미널에서 실행)

### gcloud CLI 설치 확인 및 설정

```bash
# gcloud 설치 확인
gcloud --version

# 없으면 설치 (macOS)
brew install google-cloud-sdk

# Google Cloud 로그인
gcloud auth login

# spam 프로젝트 설정
gcloud config set project spam
```

### 필요한 API 및 리소스 생성

아래 명령어들을 **순서대로** 복사해서 실행하세요:

```bash
# 1. API 활성화
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# 2. Artifact Registry 저장소 생성
gcloud artifacts repositories create srh-photo \
    --repository-format=docker \
    --location=asia-northeast3 \
    --description="SRH Photo application"

# 3. 서비스 계정 생성
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions Service Account"

# 4. 서비스 계정에 권한 부여
gcloud projects add-iam-policy-binding spam \
    --member="serviceAccount:github-actions@spam.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding spam \
    --member="serviceAccount:github-actions@spam.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding spam \
    --member="serviceAccount:github-actions@spam.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding spam \
    --member="serviceAccount:github-actions@spam.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# 5. Workload Identity Pool 생성
gcloud iam workload-identity-pools create "github-pool" \
    --location="global" \
    --display-name="GitHub Actions Pool"

# 6. GitHub Provider 생성
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --location="global" \
    --workload-identity-pool="github-pool" \
    --display-name="GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# 7. 프로젝트 번호 확인 (출력값을 복사하세요!)
echo "=== PROJECT NUMBER ==="
gcloud projects describe spam --format="value(projectNumber)"

# 8. 위에서 출력된 PROJECT_NUMBER를 사용하여 바인딩
# ⚠️ 아래 명령어 실행 전에 위 명령어의 출력값(PROJECT_NUMBER)과 GitHub 저장소 경로를 확인하세요!
# 예: SRHS-SPAM/srh_photo (본인의 GitHub 저장소 경로로 변경)

PROJECT_NUMBER=$(gcloud projects describe spam --format="value(projectNumber)")
GITHUB_REPO="SRHS-SPAM/srh_photo"  # ⚠️ 본인의 GitHub Organization/Repository 경로로 변경!

gcloud iam service-accounts add-iam-policy-binding \
    github-actions@spam.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}"

# 9. Workload Identity Provider 전체 경로 확인 (출력값을 복사하세요!)
echo "=== WORKLOAD IDENTITY PROVIDER ==="
gcloud iam workload-identity-pools providers describe github-provider \
    --location=global \
    --workload-identity-pool=github-pool \
    --format="value(name)"
```

위 명령어들을 모두 실행한 후, **7번과 9번 명령어의 출력값**을 메모하세요!

---

## 2단계: GitHub Secrets에 추가할 값 정리

위 명령어들을 실행한 후, 아래 표의 값들을 확인하세요:

### GitHub Secrets 설정값

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

각 Secret을 하나씩 추가하세요:

#### 1. GCP_PROJECT_ID
```
spam
```

#### 2. GCP_WORKLOAD_IDENTITY_PROVIDER
```
1단계의 9번 명령어 출력값을 여기에 붙여넣으세요

예시:
projects/123456789012/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

#### 3. GCP_SERVICE_ACCOUNT
```
github-actions@spam.iam.gserviceaccount.com
```

#### 4. DJANGO_SECRET_KEY
```
!wA(FAv)2dzfW0UyzpBtn@%yi75dyFz#g#B9Xzy==0STpSHl0Y
```
(또는 아래 명령어로 새로 생성)
```bash
python3 -c 'import secrets, string; chars = string.ascii_letters + string.digits + "!@#%^&*(-_=+)"; print("".join(secrets.choice(chars) for i in range(50)))'
```

---

## 3단계: GitHub Secrets 추가 방법 (화면 캡처)

1. GitHub 저장소 페이지로 이동
2. **Settings** 탭 클릭
3. 왼쪽 사이드바에서 **Secrets and variables** → **Actions** 클릭
4. **New repository secret** 버튼 클릭
5. **Name**에 Secret 이름 입력 (예: `GCP_PROJECT_ID`)
6. **Secret**에 해당 값 입력
7. **Add secret** 클릭
8. 위 2단계의 4개 Secret 모두 추가

---

## 4단계: 설정 완료 확인

모든 설정이 완료되면:

```bash
# 코드 커밋 및 푸시
git add .
git commit -m "Add Cloud Run deployment configuration"
git push origin main
```

GitHub Actions 탭에서 워크플로우가 실행되는지 확인하세요!

---

## 트러블슈팅

### "already exists" 오류가 나는 경우

이미 리소스가 존재하는 경우 해당 명령어는 건너뛰고 다음으로 진행하세요.

### GitHub 저장소 경로 확인

현재 저장소의 정확한 경로를 확인하려면:
```bash
git remote -v
```

출력 예시:
```
origin  https://github.com/SRHS-SPAM/srh_photo.git (fetch)
```

여기서 `SRHS-SPAM/srh_photo`가 저장소 경로입니다.

### Workload Identity Provider 경로 다시 확인

만약 값을 놓쳤다면:
```bash
gcloud iam workload-identity-pools providers describe github-provider \
    --location=global \
    --workload-identity-pool=github-pool \
    --format="value(name)"
```
