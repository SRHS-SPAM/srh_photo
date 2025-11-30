import React, { useState } from "react";
import "./ChooseScreen.css";

const ChooseScreen = ({ selectFrame }) => {
  const [selectedFrame, setSelectedFrame] = useState(null);

  const handleFrameSelect = (frame) => {
    setSelectedFrame(frame);
  };

  const handleNext = () => {
    if (selectedFrame) {
      selectFrame(selectedFrame); // 선택된 프레임을 부모 컴포넌트에 전달
    } else {
      alert("프레임을 선택해주세요.");
    }
  };

  return (
    <div className="choose-screen">
      <h1 className="main-text">FRAME</h1>
      <div className="frame-container">
        <div className="frame-container2">
          <div
            className={`frame-option ${
              selectedFrame === "pixcel_frame" ? "selected" : ""
            }`}
            onClick={() => handleFrameSelect("pixcel_frame")}
          >
            <div className="frame-image pixcel-frame"></div>
          </div>
          <div
            className={`frame-option ${
              selectedFrame === "light_frame" ? "selected" : ""
            }`}
            onClick={() => handleFrameSelect("light_frame")}
          >
            <div className="frame-image light-frame"></div>
          </div>
          <div
            className={`frame-option ${
              selectedFrame === "dark_frame" ? "selected" : ""
            }`}
            onClick={() => handleFrameSelect("dark_frame")}
          >
            <div className="frame-image dark-frame"></div>
          </div>
          <div
            className={`frame-option ${
              selectedFrame === "ohpan_frame" ? "selected" : ""
            }`}
            onClick={() => handleFrameSelect("ohpan_frame")}
          >
            <div className="frame-image ohpan-frame"></div>
          </div>
          <div
            className={`frame-option ${
              selectedFrame === "spam_frame" ? "selected" : ""
            }`}
            onClick={() => handleFrameSelect("spam_frame")}
          >
            <div className="frame-image spam-frame"></div>
          </div>
          <div
            className={`frame-option ${
              selectedFrame === "in_frame" ? "selected" : ""
            }`}
            onClick={() => handleFrameSelect("in_frame")}
          >
            <div className="frame-image golangv1-frame"></div>
          </div>
          <div
            className={`frame-option ${
              selectedFrame === "in_frame2" ? "selected" : ""
            }`}
            onClick={() => handleFrameSelect("in_frame2")}
          >
            <div className="frame-image golangv2-frame"></div>
          </div>
        </div>
      </div>
      
      <button className="next-button" onClick={handleNext}>
        촬영하기
      </button>
    </div>
  );
};

export default ChooseScreen;