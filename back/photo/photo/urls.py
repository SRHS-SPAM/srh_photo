"""
URL configuration for photo project.
...
"""
import os
from django.contrib.staticfiles.views import serve
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

# 참고: PhotoViewSet은 catalog.urls에서 처리하므로 여기서 직접 임포트할 필요가 없습니다.

def serve_manifest(request):
    # React 빌드 폴더 내 manifest.json 위치 지정
    file_path = os.path.join(settings.BASE_DIR, '/front/public/manifest.json')
    return FileResponse(open(file_path, 'rb'), content_type='application/json')

def serve_logo(request, filename=None):
    # If filename is not provided in the URL, use the default
    if filename is None:
       if 'spamlogo.png' in request.path:
         filename = 'spamlogo.png'
       elif 'spamlogo2.png' in request.path:
         filename = 'spamlogo2.png'
       else:
         raise Http404("No filename specified")
    
    # (디버그 로깅 코드는 깔끔한 프로덕션 코드를 위해 제거했습니다. 필요하면 다시 넣으세요.)
    
    # Try multiple possible locations
    possible_paths = [
       os.path.join(settings.BASE_DIR, 'front', 'public', filename),
    ]
    
    # Check each path
    for path in possible_paths:
       if os.path.exists(path):
         return FileResponse(open(path, 'rb'))
    
    raise Http404(f"Image file {filename} not found. Tried multiple locations.")

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 🔑 핵심 수정: 모든 API 요청을 'api/' 접두사로 catalog.urls에 위임합니다.
    path('api/', include('catalog.urls')), 

    # Manifest, robots, logo 등의 정적 파일 서빙 관련 경로
    re_path(r'^(?P<path>manifest\.json|favicon\.ico|logo192\.png|logo512\.png|robots\.txt|spamlogo\.ico)$',
         TemplateView.as_view(template_name='index.html')),
    
    path('manifest.json', serve_manifest),
    path('spamlogo.png', serve_logo, {'filename': 'spamlogo.png'}),
    path('spamlogo2.png', serve_logo, {'filename': 'spamlogo2.png'}),
    path('<str:filename>', serve_logo, name='serve_logo'),

    # ❌ PhotoViewSet 수동 라우팅 제거 (catalog.urls에서 처리함)
    # path('api/photos/', PhotoViewSet.as_view({'get': 'list', 'post': 'create'}), name='photo-list'),
]

# 개발 환경에서 정적/미디어 파일 서빙 설정
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += staticfiles_urlpatterns()

# /api/ 및 /admin/ 경로는 제외하고 나머지만 React SPA로 라우팅 (Catch-all)
urlpatterns.append(re_path(r'^(?!api/)(?!admin/).*$', TemplateView.as_view(template_name='index.html')))