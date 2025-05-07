import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import "./WebcamCapture.css";

/**
 * WebcamCapture 컴포넌트 - 웹캠을 사용하여 사진 촬영 기능을 제공합니다.
 * 사용자가 카메라 버튼을 클릭하면 5초 카운트다운 후 자동으로 사진을 촬영합니다.
 * 최대 4장의 사진을 자동으로 촬영할 수 있으며, 각 사진은 960x1280 크기로 조정됩니다.
 * 외부 HDMI 웹캠이 연결되어 있으면 해당 웹캠을 우선 사용하고, 없으면 내장 웹캠을 사용합니다.
 * 
 * @param {function} addPhoto - 촬영된 사진을 상위 컴포넌트에 전달하는 콜백 함수
 * @param {number} photoCount - 현재까지 촬영된 사진 수 (0-4)
 */
const WebcamCapture = ({ addPhoto, photoCount, clearPhoto }) => {
  const webcamRef = useRef(null);// 웹캠 DOM 요소에 접근하기 위한 참조 객체
  const [capturing, setCapturing] = useState(false);// 현재 촬영 진행 중인지 여부를 나타내는 상태 (true: 촬영 중, false: 대기 중)
  const [countdown, setCountdown] = useState(0);// 카운트다운 타이머 값 (5초부터 0초까지 감소)
  const [photoIndex, setPhotoIndex] = useState(0);// 현재 촬영 중인 사진의 인덱스 (0부터 시작하여 최대 3까지)
  const [isProcessing, setIsProcessing] = useState(false);// 사진 처리(크롭 등) 중인지 여부를 나타내는 상태 (중복 처리 방지)
  const [videoDevices, setVideoDevices] = useState([]);// 사용 가능한 비디오 장치 목록
  const [selectedDeviceId, setSelectedDeviceId] = useState("");// 선택된 비디오 장치 ID

  // 사용 가능한 비디오 장치를 감지하는 함수
  const getVideoDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === "videoinput");
      setVideoDevices(videoInputs);
      
      // HDMI 연결 웹캠 탐지 (일반적으로 외부 웹캠은 내장 웹캠 이후에 등록됨)
      const externalWebcams = videoInputs.filter(device => 
        !device.label.toLowerCase().includes("built") && 
        !device.label.toLowerCase().includes("internal")
      );
      
      // 외부 웹캠이 있으면 첫 번째 외부 웹캠을 선택, 없으면 내장 웹캠 선택
      if (externalWebcams.length > 0) {
        console.log("외부 웹캠 감지됨:", externalWebcams[0].label);
        setSelectedDeviceId(externalWebcams[0].deviceId);
      } else if (videoInputs.length > 0) {
        console.log("내장 웹캠 사용:", videoInputs[0].label);
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (error) {
      console.error("비디오 장치 감지 오류:", error);
    }
  }, []);

  // 컴포넌트 마운트 시 비디오 장치 감지
  useEffect(() => {
    getVideoDevices();
    
    // 장치 변경 이벤트 리스너 등록
    navigator.mediaDevices.addEventListener('devicechange', getVideoDevices);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getVideoDevices);
    };
  }, [getVideoDevices]);

  const playSound = () => { // 카메라 소리
    const audio = new Audio("./mp3.mp3");
    audio.play();
  };

  // 촬영함수
  const capture = () => {
    if (photoCount >= 4 || capturing) return;// 이미 4장을 찍었거나 촬영 중이면 추가 촬영 방지
    setCapturing(true);// 촬영 상태 활성화
    setCountdown(5);// 5초 카운트다운 시작
    setPhotoIndex(0);// 현재 세션의 촬영 인덱스 초기화 (새로운 촬영 시작)
  };

  /**
   * 사진 추가 함수 (메모이제이션)
   * 촬영된 이미지를 상위 컴포넌트로 전달하는 함수입니다.
   * useCallback을 사용하여 불필요한 재렌더링을 방지합니다.
   * 
   * @param {string} imageSrc - 촬영된 이미지의 데이터 URL (base64 인코딩)
   */
  const handleAddPhoto = useCallback(
    (imageSrc) => {
      addPhoto(imageSrc);// 부모 컴포넌트로부터 전달받은 addPhoto 함수를 호출하여 이미지 전달
    },
    [addPhoto] // addPhoto 함수가 변경될 때만 handleAddPhoto 함수가 재생성됨
  );

  /**
   * 이미지 크롭 함수
   * 촬영된 원본 이미지를 960x1280 크기로 조정하고 중앙에 배치합니다.
   * 비율을 유지하면서 지정된 크기에 맞게 이미지를 확대/축소합니다.
   * 
   * @param {string} imageSrc - 원본 이미지의 데이터 URL (base64 인코딩)
   * @returns {Promise<string>} - 크롭 및 조정된 이미지의 데이터 URL을 반환하는 Promise
   */
  const cropImage = (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();// 이미지 객체 생성
      img.src = imageSrc;

      // 이미지 로드 완료 시 실행되는 콜백
      img.onload = () => { // 캔버스 생성 (이미지 편집을 위한 가상 드로잉 공간)
        const canvas = document.createElement("canvas");
        canvas.width = 1920;// 목표 출력 크기 설정 (960x1280)
        canvas.height = 2560;
        
        // 캔버스 2D 컨텍스트 가져오기 (그리기 작업을 위한 객체)
        const ctx = canvas.getContext("2d");

        
        const scale = Math.max(// 이미지가 캔버스를 완전히 채우도록 스케일 계산
          canvas.width / img.width,// 너비와 높이 중 더 큰 비율을 사용하여 이미지가 잘리지 않도록 함
          canvas.height / img.height
        );
        
        // 이미지를 캔버스 중앙에 배치하기 위한 x, y 좌표 계산
        const x = canvas.width / 2 - (img.width / 2) * scale;
        const y = canvas.height / 2 - (img.height / 2) * scale;
   
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);// 계산된 위치와 크기로 이미지를 캔버스에 그리기
        const croppedImageSrc = canvas.toDataURL("image/jpeg", 1.0);// 캔버스의 내용을 고품질(1.0) JPEG 이미지로 변환
        resolve(croppedImageSrc);// Promise 해결: 크롭된 이미지 URL 반환
      };
    });
  };

  /**
   * 카운트다운 타이머와 사진 촬영 로직을 처리하는 Effect
   * 컴포넌트의 상태에 따라 타이머 관리 및 사진 촬영 프로세스를 처리합니다.
   */
  useEffect(() => {
    let timer; // 타이머 ID를 저장할 변수 (클린업 함수에서 사용)
    
    
    if (capturing && countdown > 0) { // 카운트다운 진행 중일 때 (capturing=true & countdown > 0)
      timer = setTimeout(() => { // 1초마다 카운트다운 감소
        setCountdown(countdown - 1);
      }, 1000);
    } 
    else if ( // 카운트다운이 끝나고 사진을 촬영해야 할 때 실행되는 조건
      countdown === 0 &&     // 카운트다운이 0에 도달했고
      capturing &&           // 촬영 모드가 활성화되어 있으며
      photoIndex < 4 &&      // 아직 4장을 다 찍지 않았고
      !isProcessing          // 현재 다른 사진 처리 중이 아닐 때
    ) {
      // 사진 처리 중 상태로 설정 (중복 처리 방지)
      setIsProcessing(true);
      
      // 웹캠에서 현재 화면 캡처
      const imageSrc = webcamRef.current.getScreenshot();
      
      // 캡처된 이미지가 있을 경우
      if (imageSrc) {
        cropImage(imageSrc).then((croppedImage) => {  // 이미지 크롭 작업 수행 (비동기)
          handleAddPhoto(croppedImage);// 크롭된 이미지를 상위 컴포넌트에 전달          
          playSound();// 촬영 사운드 재생
          setPhotoIndex(photoIndex + 1);// 다음 사진 인덱스로 업데이트
          setCountdown(5);// 다음 사진을 위해 다시 5초 카운트다운 시작
          setIsProcessing(false);// 사진 처리 완료 표시
        });
      } else { 
        setIsProcessing(false);// 이미지 캡처에 실패한 경우 처리 중 상태 해제
      }
    }
    // 촬영 종료 조건 확인
    // 현재 세션에서 4장을 찍었거나, 전체 누적 사진이 4장 이상이면 촬영 종료
    if (photoIndex >= 4 || photoCount >= 4) {
      setCapturing(false);
    }

    // 컴포넌트 언마운트 또는 의존성 배열 값이 변경될 때 타이머 정리
    return () => clearTimeout(timer);
  }, [
    // 의존성 배열: 이 값들이 변경될 때마다 useEffect가 재실행됨
    capturing,        // 촬영 상태
    countdown,        // 카운트다운 값
    handleAddPhoto,   // 사진 추가 함수
    photoIndex,       // 현재 촬영 인덱스
    photoCount,       // 총 촬영된 사진 수
    isProcessing,     // 처리 중 상태
  ]);

  return (
    <div className="webcam-container">
      <img src={`${process.env.PUBLIC_URL}/camera-frame.png`} className="camera-frame" alt="카메라 프레임"/>
      {selectedDeviceId ? (
        <Webcam
          audio={false}                 // 오디오 캡처 비활성화
          ref={webcamRef}               // 웹캠 참조 설정 (스크린샷 촬영에 사용)
          screenshotFormat="image/jpeg" // 스크린샷 포맷 지정
          videoConstraints={{           // 비디오 설정
            deviceId: selectedDeviceId, // 선택된 카메라 장치 ID 사용
            width: 960,                 // 비디오 너비
            height: 1280,               // 비디오 높이
          }}
          className="webcam"            // CSS 클래스 적용
        />
      ) : (
        <div className="webcam-loading">카메라를 찾는 중...</div>
      )}
      
      {/* 카운트다운 오버레이 - 촬영 중일 때만 표시 */}
      {capturing && countdown > 0 && (
        <div className="countdown-overlay">{countdown}</div>
      )}
      
      {/* 컨트롤 패널 - 사진 개수 표시 */}
      <div className="controls">
        <p>{photoCount}/4</p>
      </div>
      
      {/* 카메라 촬영 버튼 - 클릭 시 촬영 시작 */}
      <button className="camera-button" onClick={capture} disabled={!selectedDeviceId}>
        <img className="camera-icon" src={`${process.env.PUBLIC_URL}/camera.png`} alt="촬영" />
      </button>
    </div>
  );
};

export default WebcamCapture;