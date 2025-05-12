import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import "./PhotoFrame.css";

const frameLayouts = {
  pixcel_frame: [
    { width: 512, height: 712, top: 128, left: 78 },
    { width: 512, height: 712, top: 128, left: 610 }, 
    { width: 512, height: 712, top: 845, left: 78 },
    { width: 512, height: 712, top: 845, left: 610 },
  ],
  light_frame: [
    { width: 512, height: 712, top: 128, left: 78 },
    { width: 512, height: 712, top: 128, left: 610 },
    { width: 512, height: 712, top: 845, left: 78 },
    { width: 512, height: 712, top: 845, left: 610 },
  ],
  dark_frame: [
    { width: 512, height: 712, top: 128, left: 78 },
    { width: 512, height: 712, top: 128, left: 610 },
    { width: 512, height: 712, top: 845, left: 78 },
    { width: 512, height: 712, top: 845, left: 610 },
  ],
  ohpan_frame: [
    { width: 472, height: 652, top: 245, left: 76 },
    { width: 472, height: 652, top: 160, left: 634 },
    { width: 472, height: 652, top: 972, left: 76 },
    { width: 472, height: 652, top: 888, left: 634 },
  ],
  spam_frame: [
    { width: 512, height: 712, top: 220, left: 63 },
    { width: 512, height: 712, top: 137, left: 626 },
    { width: 512, height: 712, top: 952, left: 63 },
    { width: 512, height: 712, top: 861, left: 626 },
  ],
};

const PhotoFrame = ({ photos, frameType, onBack, title = "인생네컷" }) => {
  // 컴포넌트 상태 관리를 위한 상태 변수들
  const layouts = frameLayouts[frameType] || [];
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mergedImageUrl, setMergedImageUrl] = useState(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  // 인쇄 상태 추적을 위한 ref
  const hasPrintedRef = useRef(false);

  // 이미지를 서버에 업로드하고 QR 코드 URL 받기
  const uploadImageToServer = async (imageUrl) => {
    try {
      setIsUploading(true);
      
      // base64 이미지 URL을 Blob으로 변환
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`이미지 가져오기 실패: ${response.status}`);
      }
      const blob = await response.blob();
      
      // FormData 생성 및 이미지 추가
      const formData = new FormData();
      const timestamp = new Date().getTime();
      const fileName = `${title}_${timestamp}.png`;
      
      formData.append('title', `${title}_${timestamp}`);
      formData.append('image', blob, fileName);
  
      // API 기본 URL 결정 (개발 환경 vs 프로덕션 환경)
      const apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8000'
        : 'https://srh-photo.onrender.com';
  
      console.log("현재 호스트:", window.location.hostname);
      console.log("사용할 API 기본 URL:", apiBaseUrl);
  
      // 전체 API URL 구성
      const apiUrl = `${apiBaseUrl}/api/upload/`;
      console.log("최종 API URL:", apiUrl);
  
      // 서버에 이미지 업로드 - CORS 문제 해결을 위한 설정
      const uploadResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include', // 같은 도메인일 때만 쿠키 전송
        mode: 'cors', // CORS 모드 명시적 설정
        body: formData,
      });
  
      // 서버 응답 확인
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`서버 응답 오류(${uploadResponse.status}): ${errorText}`);
      }
  
      // 응답 데이터 파싱
      const data = await uploadResponse.json();
      console.log('업로드 성공 응답:', data);
  
      // QR 코드 URL 설정
      if (data.qr_code_url) {
        setQrCodeUrl(data.qr_code_url);
      }
      
      setIsUploading(false);
      return data;
    } catch (error) {
      console.error('이미지 업로드 중 오류 발생:', error);
      setIsUploading(false);
      return null;
    }
  };

  // Canvas로 이미지 합성하기
   const mergeImagesWithCanvas = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1200;
    canvas.height = 1800;
    
    try {
      // 배경 그리기
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
        frameImg.src = `${process.env.PUBLIC_URL}/${frameType}.png`;
      });
      
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
      
      // QR 코드 이미지 추가 (위치 조정)
      if (qrCodeUrl) {
        return new Promise((resolve, reject) => {
          const qrImg = new Image();
          qrImg.crossOrigin = "anonymous";
          
          qrImg.onload = () => {
            console.log('QR 코드 이미지 로드 성공', qrImg.width, qrImg.height);
            
            const qrWidth = 300;
            const qrHeight = 300;
            const qrPadding = 50;

            // QR 코드 위치를 프레임 오른쪽 하단으로 변경
            ctx.drawImage(
              qrImg, 
              canvas.width - qrWidth - qrPadding, 
              canvas.height - qrHeight - qrPadding, 
              qrWidth, 
              qrHeight
            );

            const url = canvas.toDataURL('image/png');
            setMergedImageUrl(url);
            setIsPreviewReady(true);
            resolve(url);
          };

          qrImg.onerror = (error) => {
            console.error('QR 코드 이미지 로드 실패', error);
            
            // 이미지 로드 실패해도 기존 캔버스 이미지는 유지
            const url = canvas.toDataURL('image/png');
            setMergedImageUrl(url);
            setIsPreviewReady(true);
            resolve(url);
          };

          qrImg.src = qrCodeUrl;
        });
      }
      
      // QR 코드 없을 경우의 기본 처리
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
            autoPrint(imgData);
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

  // 자동 출력 기능
  const autoPrint = (imgData) => {
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
              background-color: white;
            }
            img {
              width: 100mm;
              height: 148mm;
              object-fit: contain;
              display: block;
            }
            /* 인쇄 시 배경색도 인쇄되도록 설정 */
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <img id="printImage" src="${imgData}" alt="Print Image">
          <script>
            // 페이지가 완전히 로드되면 자동으로 인쇄 다이얼로그 실행
            window.onload = function() {
              // 이미지 로드 완료 확인
              var img = document.getElementById('printImage');
              
              // 이미지가 이미 로드되었거나 로드될 때 인쇄 시작
              if (img.complete) {
                startPrint();
              } else {
                img.onload = startPrint;
              }
              
              function startPrint() {
                console.log('이미지 로드 완료, 인쇄 준비');
                // 이미지 로드 후 즉시 인쇄 시작
                setTimeout(function() {
                  console.log('인쇄 다이얼로그 실행');
                  window.print();
                  
                  // 인쇄 다이얼로그가 닫힌 후 창 닫기
                  window.onfocus = function() {
                    console.log('인쇄 다이얼로그 종료, 창 닫기');
                    setTimeout(function() {
                      window.close();
                    }, 500);
                  };
                }, 500);
              }
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
          autoPrint(imgData);
        } else if (action === "download") {
          const link = document.createElement("a");
          link.href = imgData;
          link.download = `${title}_${new Date().getTime()}.png`;
          link.click();
        }
        setIsLoading(false);
      });
    } else {
      // html2canvas 방식 사용
      captureWithHtml2Canvas(action);
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

  // 컴포넌트가 마운트되면 미리 이미지 합성 및 자동 인쇄 시작
  useEffect(() => {
    if (photos.length > 0 && frameType && !hasPrintedRef.current) {
      mergeImagesWithCanvas().then(imgUrl => {
        if (imgUrl) {
          // 합성된 이미지를 서버에 업로드하고 QR 코드 URL 받기
          uploadImageToServer(imgUrl);
          
          // 자동으로 인쇄 시작 (한 번만)
          if (!hasPrintedRef.current) {
            hasPrintedRef.current = true;
            setIsLoading(true);
            setTimeout(() => {
              autoPrint(imgUrl);
              setIsLoading(false);
            }, 1000); // 이미지 처리 완료 후 1초 후에 인쇄 시작
          }
        }
      });
    }
  }, []);

  return (
    <div className="result-container">
      <div className="photo-frame-container">
        {/* 미리보기 영역 */}
        <div className="preview-container">
          {isPreviewReady && mergedImageUrl ? (// 합성된 이미지가 있으면 보여주기
            <div className="merged-image-preview" >
              <img src={mergedImageUrl} alt="합성된 인생네컷" className="result-image"/>
            </div>
          ) : ( // 로딩 중이거나 합성 실패 시 보여주는 부분 
            <div className="loading-preview">
              <p>이미지 합성 중...</p>
            </div>
          )}
          <button
            className="print-button"
            onClick={() => handleAction("print", "canvas")}
            disabled={isLoading}
          >
            {isLoading ? "처리 중..." : "출력"}
          </button>
        </div>
        
        <div className="section2">
          <div className="qr-section">
            <p className="gle">QR 코드를 스캔해 인생네컷을 저장하세요!</p>
            {isUploading ? (
              <div className="qr-loading">업로드 중...</div>
            ) : qrCodeUrl ? (
              <div className="qr-image">
                <img src={qrCodeUrl} alt="QR 코드" style={{ width: "100%", height: "100%" }}/>
              </div>
            ) : (
              <div className="qr-placeholder">QR</div>
            )}
          </div>
          
          <button className="back-button" onClick={onBack}>
            처음으로 {'>'}
          </button>
        </div>

        {/* 숨겨진 프레임 컨테이너 (html2canvas 용) */}
        <div className="frame_container" ref={containerRef}>
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
            src={`${process.env.PUBLIC_URL}/${frameType}.png`} 
            alt="프레임"
            className="frame-overlay"
            onLoad={handleFrameLoad}
            onError={handleFrameError}
            crossOrigin="anonymous"
          />
        </div>

        {/* 캔버스 영역 (화면에 보이지 않음) */}
        <canvas ref={canvasRef} className="not-see"/>
      </div> 
    </div>
  );
};

export default PhotoFrame;