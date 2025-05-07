import React from "react";
import "./TutorialScreen.css";

const TutorialScreen = ({ onComplete }) => {
    return(
        <>
        <h1 className="head">HOW TO USE</h1>
    <div className="container">
        
    <div className="left">
        <img src={`${process.env.PUBLIC_URL}/example.png`} alt="example" />
    </div>
    <div className="no-center">
    <ul><li>촬영 전 마음에 드는 프레임을 골라주세요.<br/><br/></li>
        <li>5초에 한번씩 네번의 사진이 촬영됩니다.<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;시간에 맞추어 포즈를 취해보세요!<br/><br/></li>
        <li>완성된 스팸네컷을 출력하거나 다운로드하여 <br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;간직하세요.</li>
    </ul>
    </div>
    </div>
            <button className="next-button" onClick={ onComplete }>프레임 고르러 가기</button> 
        </> 
    )
}



export default TutorialScreen;