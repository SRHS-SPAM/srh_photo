import React from "react";
import "./HowPerson.css";

const HowPerson = ({ onPerson }) => {
    return(
        <>
            <h1 className="head">HOW MANY PEOPLE</h1>
            <div className="container">
                
            </div>
            <button className="next-button" onClick={ onPerson }>프레임 고르러 가기</button> 
        </> 
    )
}



export default HowPerson;