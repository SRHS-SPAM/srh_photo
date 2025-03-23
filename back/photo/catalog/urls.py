import os
from django.http import FileResponse
from django.urls import path, include, re_path
from . import views
from rest_framework.routers import DefaultRouter
from django.contrib.staticfiles.views import serve
from django.views.generic import TemplateView
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'photos', views.PhotoViewSet)

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
            from django.http import Http404
            raise Http404("No filename specified")
    
    # Print current directory and files for debugging
    import os
    import logging
    logger = logging.getLogger(__name__)
    
    # Log current working directory
    cwd = os.getcwd()
    logger.error(f"Current working directory: {cwd}")
    
    # Log files in current directory
    try:
        files = os.listdir(cwd)
        logger.error(f"Files in current directory: {files}")
    except Exception as e:
        logger.error(f"Error listing files: {e}")
    
    # Try multiple possible locations
    possible_paths = [
        '/front/public/' + filename,
        '/app/front/public/' + filename,
        os.path.join(cwd, 'front', 'public', filename),
        os.path.join(cwd, '..', 'front', 'public', filename),
        os.path.join(cwd, '..', '..', 'front', 'public', filename),
    ]
    
    # Log all possible paths
    logger.error(f"Trying paths: {possible_paths}")
    
    # Check each path
    for path in possible_paths:
        if os.path.exists(path):
            logger.error(f"Found file at: {path}")
            return FileResponse(open(path, 'rb'))
        else:
            logger.error(f"File not found at: {path}")
    
    from django.http import Http404
    raise Http404(f"Image file {filename} not found. Tried multiple locations.")


urlpatterns = [
    path('', views.photo_list, name='photo_list'),
    path('photo/<uuid:pk>/', views.photo_detail, name='photo_detail'),
    path('photo/create/', views.photo_create, name='photo_create'),
    
    # REST API 엔드포인트
    path('api/', include(router.urls)),
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
    re_path(r'^(?P<path>manifest\.json|favicon\.ico|logo192\.png|logo512\.png|robots\.txt|spamlogo\.ico)$',
            TemplateView.as_view(template_name='index.html')),    # 다운로드 URL은 router가 자동으로 생성 (/api/photos/{pk}/download/)

    path('manifest.json', 
        TemplateView.as_view(
            template_name='manifest.json', 
            content_type='application/json'
        )),
    
    path('api/current-date/', views.get_current_date, name='current_date'),
    *static(settings.STATIC_URL, document_root=settings.STATIC_ROOT),
    path('manifest.json', serve_manifest),
    path('spamlogo.png', serve_logo, {'filename': 'spamlogo.png'}),
    path('spamlogo2.png', serve_logo, {'filename': 'spamlogo2.png'}),
    path('<str:filename>', serve_logo, name='serve_logo'),

    path('api/some-endpoint/', views.some_endpoint, name='some-endpoint'),
]
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += staticfiles_urlpatterns()