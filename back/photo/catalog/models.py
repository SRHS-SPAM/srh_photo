from django.db import models
from django.urls import reverse
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image
import uuid
import os
import subprocess #win32print 대체

class Photo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='photos/')
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        qr_exists = bool(self.qr_code.name)
        is_new = self.pk is None
        
        # 새 객체일 경우, ID를 먼저 확보하기 위해 한 번 저장합니다.
        if is_new:
            super().save(*args, **kwargs)

        try:
            # QR 코드에 사용할 URL (배포 환경에 맞게 URL을 사용)
            qr_url = f'https://srh-photo-751484481725.asia-northeast3.run.app/api/photos/{self.id}/download/'

            # QR 코드 생성
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_url)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            qr_buffer = BytesIO()
            img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)

            # QR 코드 파일 저장
            filename = f'qr_{self.id}.png'
            self.qr_code.save(filename, File(qr_buffer), save=False)

            # 이미지와 QR 코드 합성 후 출력
            # settings.MEDIA_ROOT에 파일이 실제로 존재하는지 확인합니다.
            if self.image and os.path.exists(self.image.path):
                self.print_image_with_qr(self.image.path, qr_buffer)

            # 변경 사항 저장 (새 객체가 아니거나, QR 코드/이미지 처리가 완료된 후)
            if not is_new:
                super().save(*args, **kwargs)

        except Exception as e:
            print(f"QR 코드 생성/처리 오류: {e}")
            # 오류가 발생하더라도 저장 작업은 계속 진행
            if not is_new:
                super().save(*args, **kwargs)

    def print_image_with_qr(self, image_path, qr_buffer):
        """
        이미지에 QR 코드를 합성하고 인쇄를 시도합니다.
        """
        try:
            # 이미지 불러오기
            base_image = Image.open(image_path)

            # QR 코드 이미지 불러오기
            # save 메서드에서 seek(0)을 했으므로, BytesIO 객체를 직접 사용할 수 있습니다.
            qr_image = Image.open(qr_buffer)

            # QR 코드 크기 조정 (예시: 이미지 너비의 20%)
            target_size = int(base_image.width * 0.2)
            qr_image = qr_image.resize((target_size, target_size), Image.Resampling.LANCZOS)

            # QR 코드 위치 지정 (이미지 오른쪽 하단에서 약간의 여백(padding) 적용)
            padding = 20
            position = (base_image.width - qr_image.width - padding, base_image.height - qr_image.height - padding)

            # 원본 이미지는 수정하지 않고 사본을 만듭니다.
            composite_image = base_image.copy()
            composite_image.paste(qr_image, position)

            # 임시 파일에 저장 후 출력
            temp_file_path = f"/tmp/temp_print_image_{self.id}.png"
            composite_image.save(temp_file_path)

            # 이미지 출력 (CUPS/lpr 사용)
            # 서버 환경에 맞게 프린터 이름을 지정할 수 있습니다.
            # 예시: printer_name="HP_Printer"
            self.print_image(temp_file_path, printer_name=None)
            
            # 인쇄 후 임시 파일 삭제
            os.remove(temp_file_path)

        except Exception as e:
            print(f"이미지 및 QR 코드 합성/출력 오류: {e}")

    def print_image(self, filepath, printer_name=None):
        """
        lpr 명령어를 사용하여 파일을 인쇄합니다.
        이는 Linux, macOS 환경에서 작동하는 표준 방식입니다.
        """
        try:
            command = ['lpr']
            
            if printer_name:
                command.extend(['-P', printer_name])
                print(f"지정된 프린터: {printer_name}")
            else:
                print("시스템 기본 프린터로 인쇄를 시도합니다.")
            
            command.append(filepath)

            result = subprocess.run(command, check=True, capture_output=True, text=True)
            
            print("인쇄 명령이 성공적으로 실행되었습니다.")
            print(f"lpr stdout: {result.stdout.strip()}")

        except subprocess.CalledProcessError as e:
            print(f"출력 오류 (lpr 명령 실패): {e}")
            print(f"lpr stderr: {e.stderr.strip()}")
        except FileNotFoundError:
            print("출력 오류: 'lpr' 명령어를 찾을 수 없습니다. 서버에 CUPS/lpr이 설치되어 있는지 확인하세요.")
        except Exception as e:
            print(f"출력 중 예상치 못한 오류 발생: {e}")

    def get_absolute_url(self):
        return reverse('photo_detail', args=[str(self.id)])
