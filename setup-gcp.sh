#!/bin/bash

# Google Cloud Run 배포를 위한 자동 설정 스크립트
# 이 스크립트는 필요한 모든 GCP 리소스를 생성하고 설정합니다.

set -e  # 오류 발생 시 스크립트 중단

echo "======================================"
echo "Google Cloud Run 배포 설정 시작"
echo "======================================"
echo ""

# 프로젝트 설정
PROJECT_ID="spam-475813"
SERVICE_ACCOUNT="github-actions"
REGION="asia-northeast3"
GITHUB_REPO="SRHS-SPAM/srh_photo"  # ⚠️ 본인의 GitHub 저장소 경로로 변경하세요!

echo "프로젝트 ID: $PROJECT_ID"
echo "리전: $REGION"
echo "GitHub 저장소: $GITHUB_REPO"
echo ""

# 현재 프로젝트 확인
echo "1. 프로젝트 설정 중..."
gcloud config set project $PROJECT_ID

# API 활성화
echo ""
echo "2. 필요한 API 활성화 중..."
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Artifact Registry 저장소 생성
echo ""
echo "3. Artifact Registry 저장소 생성 중..."
if gcloud artifacts repositories describe srh-photo --location=$REGION &>/dev/null; then
    echo "   → 저장소가 이미 존재합니다. 건너뜁니다."
else
    gcloud artifacts repositories create srh-photo \
        --repository-format=docker \
        --location=$REGION \
        --description="SRH Photo application"
    echo "   → 저장소 생성 완료"
fi

# 서비스 계정 생성
echo ""
echo "4. 서비스 계정 생성 중..."
if gcloud iam service-accounts describe ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com &>/dev/null; then
    echo "   → 서비스 계정이 이미 존재합니다. 건너뜁니다."
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
        --display-name="GitHub Actions Service Account"
    echo "   → 서비스 계정 생성 완료"
fi

# 서비스 계정에 권한 부여
echo ""
echo "5. 서비스 계정에 권한 부여 중..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/run.admin" \
    --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer" \
    --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser" \
    --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.admin" \
    --condition=None

echo "   → 권한 부여 완료"

# Workload Identity Pool 생성
echo ""
echo "6. Workload Identity Pool 생성 중..."
if gcloud iam workload-identity-pools describe github-pool --location=global &>/dev/null; then
    echo "   → Workload Identity Pool이 이미 존재합니다. 건너뜁니다."
else
    gcloud iam workload-identity-pools create "github-pool" \
        --location="global" \
        --display-name="GitHub Actions Pool"
    echo "   → Workload Identity Pool 생성 완료"
fi

# GitHub Provider 생성
echo ""
echo "7. GitHub Provider 생성 중..."
if gcloud iam workload-identity-pools providers describe github-provider \
    --location=global \
    --workload-identity-pool=github-pool &>/dev/null; then
    echo "   → GitHub Provider가 이미 존재합니다. 건너뜁니다."
else
    gcloud iam workload-identity-pools providers create-oidc "github-provider" \
        --location="global" \
        --workload-identity-pool="github-pool" \
        --display-name="GitHub Provider" \
        --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository_owner=='SRHS-SPAM'" \
        --issuer-uri="https://token.actions.githubusercontent.com"
    echo "   → GitHub Provider 생성 완료"
fi

# 프로젝트 번호 가져오기
echo ""
echo "8. 서비스 계정과 Workload Identity 바인딩 중..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud iam service-accounts add-iam-policy-binding \
    ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}"

echo "   → 바인딩 완료"

# Workload Identity Provider 전체 경로 가져오기
WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe github-provider \
    --location=global \
    --workload-identity-pool=github-pool \
    --format="value(name)")

# Django Secret Key 생성
DJANGO_SECRET_KEY=$(python3 -c 'import secrets, string; chars = string.ascii_letters + string.digits + "!@#%^&*(-_=+)"; print("".join(secrets.choice(chars) for i in range(50)))' 2>/dev/null)

# 결과 출력
echo ""
echo "======================================"
echo "✅ 설정 완료!"
echo "======================================"
echo ""
echo "이제 GitHub Secrets에 다음 값들을 추가하세요:"
echo ""
echo "GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret 1: GCP_PROJECT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PROJECT_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret 2: GCP_WORKLOAD_IDENTITY_PROVIDER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$WORKLOAD_IDENTITY_PROVIDER"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret 3: GCP_SERVICE_ACCOUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret 4: DJANGO_SECRET_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$DJANGO_SECRET_KEY"
echo ""
echo "======================================"
echo ""
echo "위 값들을 복사해서 GitHub Secrets에 추가한 후,"
echo "코드를 푸시하면 자동으로 배포됩니다!"
echo ""
