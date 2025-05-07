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
    
    # 들여쓰기 수정 - 이 메서드가 클래스 내부에 제대로 들여쓰기 되어 있어야 함
    def save(self, *args, **kwargs):
        # QR 코드 필드에 이미 파일이 있는지 확인
        qr_exists = bool(self.qr_code.name)
        
        # 새 객체인지 확인
        is_new = self.pk is None
        
        # 먼저 모델을 저장 (새로운 객체의 경우 ID를 얻기 위해)
        if is_new:
            super().save(*args, **kwargs)
        
        # QR 코드 항상 생성 (기존 코드는 qr_exists 체크)
        try:
            # QR 코드에 저장할 직접 다운로드 URL 생성
            qr_url = f'https://srh-photo.onrender.com/api/photos/{self.id}/download/'
            
            # QR 코드 생성
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_url)
            qr.make(fit=True)
            
            # QR 코드 이미지 생성
            img = qr.make_image(fill_color="black", back_color="white")
            
            # BytesIO를 사용하여 메모리에 저장
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            # 파일명 생성
            filename = f'qr_{self.id}.png'
            
            # 기존 QR 코드가 있으면 삭제
            if self.qr_code:
                if os.path.isfile(self.qr_code.path):
                    os.remove(self.qr_code.path)
            
            # QR 코드 저장 (save=False로 재귀 호출 방지)
            self.qr_code.save(filename, File(buffer), save=False)
            
            # 이미 저장된 객체라면 다시 저장
            if not is_new:
                super().save(*args, **kwargs)
        except Exception as e:
            print(f"QR 코드 생성 오류: {e}")
            # 오류가 발생해도 객체는 저장
            if not is_new:
                super().save(*args, **kwargs)
    
    def get_absolute_url(self):
        return reverse('photo_detail', args=[str(self.id)])