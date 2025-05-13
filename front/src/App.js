import React, { useState } from "react";
import StartScreen from "./screen/StartScreen";
import ChooseScreen from "./screen/ChooseScreeen";
import WebcamCapture from "./screen/WebcamCapture"; // 예시 프레임 카메라 컴포넌트
import PhotoFrame from "./screen/PhotoFrame";
import IdolCam from "./screen/IdolCam";
import TutorialScreen from "./screen/TutorialScreen";
import HowPerson from "./screen/HowPerson";
//import PhotoFrameTest from "./screen/PhotoFrameTest"

import "./App.css";

function App() {
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("start"); // 화면 전환 하는거
  const [selectedFrame, setSelectedFrame] = useState(null);

  const addPhoto = (photo) => {
    if (photos.length < 4) {
      setPhotos((prevPhotos) => [...prevPhotos, photo]);
    }
    if (photos.length === 3) {
      // 마지막 사진이 추가되었을 때
      setIsCapturing(false); // 촬영 종료
      setCurrentScreen("result"); // 결과 화면으로 이이동ㅇ
    }
  };

  const handleStart = () => {
    setCurrentScreen("tutorial"); // Tutorial로 이동 > 시작화면
  };

  const handleHowPerson = () => {
    setCurrentScreen("howperson"); // Howperdon으로 이동 > 튜토
  };

  const handleTutorialComplete = () => {
    setCurrentScreen("choose"); // ChooseScreen으로 이동 > 인원 고르는거
  };

  const handleFrameSelect = (frame) => {
    setSelectedFrame(frame); // 선택한 프레임 설정
    setIsCapturing(true); // 사진 촬영 시작
    setPhotos([]); // 새로운 프레임을 선택할 때 photos 배열 초기화
    setCurrentScreen("capture"); // 캡처 화면으로 전환
  };

  const handleBack = () => {
    setCurrentScreen("start"); // 처음 화면으로 이동
    setPhotos([]); // photos 배열 초기화
  }

  const clearPhoto = () => {
    setPhotos([]);
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "start":
        return <StartScreen onStart={handleStart}/>; // onStart 하면 handleStart 호출하는 거
      case "tutorial":
        return <TutorialScreen onComplete={handleHowPerson} />;
      case "howperson":
        return <HowPerson onPerson={handleTutorialComplete}/>
      case "choose":
        return <ChooseScreen selectFrame={handleFrameSelect} />;
      
      case "capture":
        return selectedFrame === "park_frame" ? (
          <IdolCam
            addPhoto={addPhoto}
            photoCount={photos.length}
            setIsCapturing={setIsCapturing}
          />
        ) : (
          <WebcamCapture addPhoto={addPhoto} photoCount={photos.length} clearPhoto={clearPhoto}/>
        );
      case "result":
        return (
          <div>
            <PhotoFrame photos={photos} frameType={selectedFrame} onBack={handleBack}/>
          </div>
        );
      default:
        return <StartScreen onStart={handleStart} />;
    }
  };

  return <div className="App">{renderScreen()}</div>;
}

export default App;