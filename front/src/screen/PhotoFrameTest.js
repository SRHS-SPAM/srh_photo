import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import "./PhotoFrame.css";

const frameLayouts = {
  pixcel_frame: [
    { width: 512, height: 612, top: 406, left: 63 },
    { width: 512, height: 612, top: 137, left: 626 },
    { width: 512, height: 612, top: 1050, left: 63 },
    { width: 512, height: 612, top: 781, left: 626 },
  ],
  light_frame: [
    { width: 512, height: 612, top: 406, left: 63 },
    { width: 512, height: 612, top: 137, left: 626 },
    { width: 512, height: 612, top: 1050, left: 63 },
    { width: 512, height: 612, top: 781, left: 626 },
  ],
  dark_frame: [
    { width: 512, height: 612, top: 406, left: 63 },
    { width: 512, height: 612, top: 137, left: 626 },
    { width: 512, height: 612, top: 1050, left: 63 },
    { width: 512, height: 612, top: 781, left: 626 },
  ],
  ohpan_frame: [
    { width: 512, height: 612, top: 406, left: 63 },
    { width: 512, height: 612, top: 137, left: 626 },
    { width: 512, height: 612, top: 1050, left: 63 },
    { width: 512, height: 612, top: 781, left: 626 },
  ],
  merun_frame: [
    { width: 513, height: 612, top: 406, left: 63 },
    { width: 513, height: 612, top: 137, left: 626 },
    { width: 513, height: 612, top: 1050, left: 63 },
    { width: 513, height: 612, top: 781, left: 625 },
  ],
  spam_frame: [
    { width: 512, height: 612, top: 406, left: 63 },
    { width: 512, height: 612, top: 137, left: 625 },
    { width: 512, height: 612, top: 1050, left: 63 },
    { width: 512, height: 612, top: 781, left: 626 },
  ],
};

const PhotoFrameTest = ({ photos, frameType, onNext, title = "인생네컷" }) => {
  const layouts = frameLayouts[frameType] || [];
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mergedImageUrl, setMergedImageUrl] = useState(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  // Canvas로 이미지 합성하기
  const mergeImagesWithCanvas = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 프레임의 원래 크기를 기준으로 설정
    canvas.width = 1200; // 프레임 너비에 맞게 조정
    canvas.height = 1800; // 프레임 높이에 맞게 조정
    
    try {
      // 배경 그리기 (프레임이 투명 배경인 경우)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 각 사진 로드 및 그리기
      for (let i = 0; i < Math.min(photos.length, layouts.length); i++) {
        if (!photos[i]) continue;
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = photos[i];
        });
        
        const layout = layouts[i];
        ctx.drawImage(img, layout.left, layout.top, layout.width, layout.height);
      }
      
      // 프레임 이미지 로드 및 그리기
      const frameImg = new Image();
      frameImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        frameImg.onload = resolve;
        frameImg.onerror = (e) => {
          console.error("프레임 이미지 로드 실패:", e);
          reject(e);
        };
        frameImg.src = `/${frameType}.png`;
      });
      
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
      
      // 결과 URL 설정
      const url = canvas.toDataURL('image/png');
      setMergedImageUrl(url);
      setIsPreviewReady(true);
      
      return url;
    } catch (error) {
      console.error("이미지 합성 중 오류 발생:", error);
      return null;
    }
  };

  // html2canvas를 이용한 캡처
  const captureWithHtml2Canvas = (action) => {
    setIsLoading(true);
    const frame = containerRef.current;

    if (!frame) {
      alert("프레임을 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }

    const images = frame.querySelectorAll("img");
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    Promise.all(imagePromises).then(() => {
      html2canvas(frame, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        allowTaint: true,
        width: frame.offsetWidth,
        height: frame.offsetHeight,
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          
          if (action === "print") {
            const printContent = `
            <html>
              <head>
                <title>${title}</title>
                <style>
                  @page {
                    size: 100mm 148mm; /* Hagaki size */
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  img {
                    width: 100mm;
                    height: 148mm;
                    object-fit: contain;
                  }
                </style>
              </head>
              <body>
                <img src="${imgData}" alt="Print Image">
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                      window.close();
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `;
            const printWindow = window.open("", "_blank");
            if (printWindow) {
              printWindow.document.write(printContent);
              printWindow.document.close();
            } else {
              alert("팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.");
            }
          } else if (action === "download") {
            const link = document.createElement("a");
            link.href = imgData;
            link.download = `${title}_${new Date().getTime()}.png`;
            link.click();
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("캡처 중 오류 발생:", err);
          alert("이미지 캡처 중 오류가 발생했습니다.");
          setIsLoading(false);
        });
    });
  };

  // 다운로드/출력 메소드
  const handleAction = (action, method = "html2canvas") => {
    if (method === "canvas") {
      // Canvas 방식을 사용하여 이미지 합성 후 처리
      setIsLoading(true);
      mergeImagesWithCanvas().then(imgData => {
        if (!imgData) {
          setIsLoading(false);
          alert("이미지 합성 중 오류가 발생했습니다.");
          return;
        }
        
        if (action === "print") {
          const printContent = `
          <html>
            <head>
              <title>${title}</title>
              <style>
                @page {
                  size: 100mm 148mm; /* Hagaki size */
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                img {
                  width: 100mm;
                  height: 148mm;
                  object-fit: contain;
                }
              </style>
            </head>
            <body>
              <img src="${imgData}" alt="Print Image">
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `;
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
          } else {
            alert("팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.");
          }
        } else if (action === "download") {
          const link = document.createElement("a");
          link.href = imgData;
          link.download = `${title}_${new Date().getTime()}.png`;
          link.click();
        } else if (action === "upload") {
          // 이미지를 Django 백엔드로 전송
          uploadImageToDjango(imgData);
        }
        setIsLoading(false);
      });
    } else {
      // html2canvas 방식 사용
      captureWithHtml2Canvas(action);
    }
  };
  
  // Django 백엔드로 이미지 업로드하는 함수
  const uploadImageToDjango = (imgData) => {
    // Base64 데이터 URL에서 실제 바이너리 데이터 추출
    // "data:image/png;base64," 부분을 제거하고 실제 데이터만 가져옴
    const base64Data = imgData.split(',')[1];
    
    // FormData 객체 생성
    const formData = new FormData();
    
    // base64 문자열을 Blob으로 변환
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }
    
    const byteArray = new Uint8Array(byteArrays);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    // FormData에 파일 추가
    formData.append('image', blob, `${title}_${new Date().getTime()}.png`);
    
    // 필요한 추가 데이터 (예: 프레임 타입, 사용자 ID 등)
    formData.append('frame_type', frameType);
    formData.append('title', title);
    
    // Django 백엔드로 POST 요청 보내기
    fetch('https://your-django-backend-url.com/api/upload-image/', {
      method: 'POST',
      body: formData,
      // 필요한 경우 인증 헤더 추가
      // headers: {
      //   'Authorization': 'Bearer your-token-here'
      // }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('서버 응답이 올바르지 않습니다.');
        }
        return response.json();
      })
      .then(data => {
        console.log('이미지 업로드 성공:', data);
        
        // QR 코드 URL을 응답으로 받았다면 UI 업데이트
        if (data.qr_code_url) {
          // QR 코드 이미지 업데이트 로직
          updateQRCode(data.qr_code_url);
        }
        
        alert('이미지가 성공적으로 업로드되었습니다!');
      })
      .catch(error => {
        console.error('이미지 업로드 실패:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
      });
  };
  
  // QR 코드 이미지 업데이트 함수
  const updateQRCode = (qrCodeUrl) => {
    // 현재 QR 코드 placeholder를 실제 QR 코드로 교체
    const qrPlaceholder = document.querySelector('.qr-placeholder');
    if (qrPlaceholder) {
      qrPlaceholder.innerHTML = '';
      const qrImage = document.createElement('img');
      qrImage.src = qrCodeUrl;
      qrImage.alt = 'QR Code';
      qrImage.style.width = '100%';
      qrImage.style.height = '100%';
      qrPlaceholder.appendChild(qrImage);
    }
  };

  // 프레임 이미지 로드 확인
  const handleFrameLoad = () => {
    setFrameLoaded(true);
  };

  // 이미지 로드 오류 처리
  const handleFrameError = () => {
    console.error("프레임 이미지 로드 중 오류 발생");
    setFrameLoaded(false);
  };

  // 컴포넌트가 마운트되면 미리 이미지 합성
  useEffect(() => {
    if (photos.length > 0 && frameType) {
      mergeImagesWithCanvas();
    }
  }, [photos, frameType]);

  return (
    <div className="photo-frame-with-download-container">
      {/* 미리보기 영역 */}
      <div className="preview-container" style={{ marginBottom: '20px' }}>
        {isPreviewReady && mergedImageUrl ? (
          // 합성된 이미지가 있으면 보여주기
          <div className="merged-image-preview" style={{ 
            width: '300px', 
            height: '450px', 
            margin: '0 auto', 
            textAlign: 'center' 
          }}>
            <img 
              src={mergedImageUrl} 
              alt="합성된 인생네컷" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain' 
              }}
            />
          </div>
        ) : (
          // 로딩 중이거나 합성 실패 시 보여주는 부분
          <div className="loading-preview" style={{ 
            width: '300px', 
            height: '450px', 
            margin: '0 auto', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '5px'
          }}>
            <p>이미지 합성 중...</p>
          </div>
        )}
      </div>

      {/* 숨겨진 프레임 컨테이너 (html2canvas 용) */}
      <div 
        className="photo-frame-container" 
        ref={containerRef}
        style={{
          position: 'relative',
          width: '300px',
          height: '450px',
          margin: '0 auto',
          display: 'none'
        }}
      >
        {photos.map((photo, index) => (
          <img
            key={index}
            src={photo}
            alt={`사진 ${index + 1}`}
            className={`photo${index + 1}`}
            style={{
              width: layouts[index]?.width / 4,
              height: layouts[index]?.height / 4,
              top: layouts[index]?.top / 4,
              left: layouts[index]?.left / 4,
              position: 'absolute',
              objectFit: 'cover'
            }}
            crossOrigin="anonymous"
          />
        ))}
        <img
          src={`/${frameType}.png`}
          alt="프레임"
          className="frame-overlay"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            zIndex: 10
          }}
          onLoad={handleFrameLoad}
          onError={handleFrameError}
          crossOrigin="anonymous"
        />
      </div>

      {/* QR 코드 섹션 */}
      <div className="qr-section" style={{ 
        backgroundColor: '#f0f0f0', 
        padding: '15px', 
        borderRadius: '5px',
        margin: '15px 0',
        textAlign: 'center'
      }}>
        <p>QR 코드를 스캔해 인생네컷을 저장하세요!</p>
        <div className="qr-placeholder" style={{ 
          width: '80px', 
          height: '80px', 
          backgroundColor: '#ccc',
          margin: '10px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold'
        }}>
          QR
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="button-container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '15px'
      }}>
        <button
          className="print-button"
          onClick={() => handleAction("print", "canvas")}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 15px',
            backgroundColor: '#ddd',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '5px'
          }}
        >
          {isLoading ? "처리 중..." : "출력"}
        </button>
        
        <button
          className="next-button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginLeft: '5px'
          }}
        >
          저장으로 {'>'}
        </button>
      </div>

      {/* 캔버스 영역 (화면에 보이지 않음) */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }} 
      />
    </div>
  );
};

export default PhotoFrameTest;