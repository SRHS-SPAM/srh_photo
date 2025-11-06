from django.db import models
from django.urls import reverse
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image
import uuid
import os

class Photo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='photos/')
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        # 1. 새 객체라면 ID를 확보하기 위해 먼저 저장합니다.
        if is_new:
            # save=False를 사용하더라도 재귀에 빠지지 않도록 주의합니다.
            super().save(*args, **kwargs)
        
        try:
            # QR 코드 생성 로직은 유지
            # 📢 URL은 환경 변수 등으로 관리하는 것이 좋습니다.
            qr_url = f'https://srh-photo-751484481725.asia-northeast3.run.app/api/photos/{self.id}/download/'
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_url)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # BytesIO를 사용하여 메모리에 저장
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            filename = f'qr_{self.id}.png'
            
            # 2. ⚠️ [수정된 부분] 기존 QR 코드 파일 삭제 시, Django의 스토리지 API 사용
            if self.qr_code and not is_new:
                # 로컬 파일 시스템이 아닌, 설정된 스토리지(S3, GCS 등)에서 파일을 삭제합니다.
                self.qr_code.delete(save=False) 
            
            # 3. 새 QR 코드 저장 (save=False로 재귀 방지)
            self.qr_code.save(filename, File(buffer), save=False)
            
        except Exception as e:
            print(f"QR 코드 생성/처리 오류: {e}")
            
        # 4. 최종적으로 저장 (새 객체이거나, QR 코드가 업데이트되었을 때)
        # is_new인 경우는 이미 1차 저장이 되었지만, QR_code 필드 업데이트를 위해 다시 저장합니다.
        super().save(*args, **kwargs)
    
    def get_absolute_url(self):
        return reverse('photo_detail', args=[str(self.id)])