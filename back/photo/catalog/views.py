from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse, FileResponse, JsonResponse
from .models import Photo
from .forms import PhotoForm
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from .serializers import PhotoSerializer
import os
from datetime import datetime
from rest_framework.parsers import MultiPartParser, FormParser
import logging
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

logger = logging.getLogger(__name__)

# 기존 뷰 유지
def photo_list(request):
    photos = Photo.objects.all().order_by('-created_at')
    return render(request, 'photos/photo_list.html', {'photos': photos})

def photo_detail(request, pk):
    photo = get_object_or_404(Photo, pk=pk)
    return render(request, 'photos/photo_detail.html', {'photo': photo})

def photo_create(request):
    if request.method == 'POST':
        form = PhotoForm(request.POST, request.FILES)
        if form.is_valid():
            photo = form.save()
            return redirect('photo_detail', pk=photo.id)
    else:
        form = PhotoForm()
    return render(request, 'photos/photo_form.html', {'form': form})

# React와 통신하기 위한 API 뷰 추가
logger = logging.getLogger(__name__)

@csrf_exempt
@api_view(['POST', 'OPTIONS', 'GET'])
def upload_photo(request):
    # OPTIONS 요청 처리 (CORS preflight)
    if request.method == 'OPTIONS':
        response = Response(status=status.HTTP_200_OK)
        response['Access-Control-Allow-Origin'] = 'https://srh-photo-d86feda25493.herokuapp.com'  # 또는 특정 도메인
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS, GET'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-Requested-With'
        return response
    
    logger.info("파일 업로드 요청 받음")
    logger.debug(f"Request data: {request.data}")
    logger.debug(f"Request FILES: {request.FILES}")
    
    serializer = PhotoSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Serializer errors: {serializer.errors}")
        return Response({"error": "Invalid data", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
    photo = serializer.save()
    logger.info("사진 업로드 성공")
    
    # CORS 헤더를 포함한 응답
    response = Response(serializer.data, status=status.HTTP_201_CREATED)
    response['Access-Control-Allow-Origin'] = 'https://srh-photo-d86feda25493.herokuapp.com'
    return response


@method_decorator(csrf_exempt, name='dispatch')
class PhotoViewSet(viewsets.ModelViewSet):
    queryset = Photo.objects.all().order_by('-created_at')
    serializer_class = PhotoSerializer
    parser_classes = (MultiPartParser, FormParser)  # 파일 업로드 지원

    def dispatch(self, request, *args, **kwargs):
        # OPTIONS 요청 처리 (CORS preflight)
        if request.method == 'OPTIONS':
            response = Response(status=status.HTTP_200_OK)
            response['Access-Control-Allow-Origin'] = 'https://srh-photo-d86feda25493.herokuapp.com'
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-Requested-With, Authorization'
            return response
        return super().dispatch(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        logger.info("PhotoViewSet - 파일 업로드 요청 받음")
        logger.debug(f"Request data: {request.data}")
        logger.debug(f"Request FILES: {request.FILES}")

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Serializer errors: {serializer.errors}")
            response = Response(
                {"error": "Invalid data", "details": serializer.errors}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            logger.info("사진 업로드 성공")
            response = Response(
                serializer.data, 
                status=status.HTTP_201_CREATED, 
                headers=headers
            )
        
        # CORS 헤더 추가
        response['Access-Control-Allow-Origin'] = 'https://srh-photo-751484481725.asia-northeast3.run.app'
        return response
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response['Access-Control-Allow-Origin'] = '*'
        return response
    
    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        response['Access-Control-Allow-Origin'] = '*'
        return response
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        photo = self.get_object()
        file_path = photo.image.path
        
        if os.path.exists(file_path):
            response = FileResponse(open(file_path, 'rb'))
            response['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'
            response['Access-Control-Allow-Origin'] = '*'
            return response
        
        response = Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
        response['Access-Control-Allow-Origin'] = '*'
        return response
    
def some_endpoint(request):
    data = {'message': 'Hello from Django!'}
    return JsonResponse(data)

from django.shortcuts import render

def index(request):
    return render(request, 'index.html')  # React build된 HTML