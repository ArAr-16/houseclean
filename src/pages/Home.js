import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import cleaners from "./cleaners.jpg"; // import image
import cleaners2 from "./cleaners2.jpg";
import cleaners3 from "./cleaners3.jpg";

function Home() {
  const images = [cleaners, cleaners2, cleaners3]; 
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  // Auto-slide every 3 seconds 
  useEffect(() => { 
    const interval = setInterval(() => { 
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length); 
    }, 3000); 
    return () => clearInterval(interval); 
  }, [images.length]);

  return (
    <section className="Home">
      <div className="Home-text">
        <h1><strong>HOUSECLEAN:</strong> Connecting households with trusted cleaners to simplify requests, scheduling, and payments.</h1>
        <div class="text-with-line">A clean home begins with a simple request—let us handle the rest.</div>
        <button className="Gbutton" onClick={() => navigate('/login')}>Get Started</button>
      </div>
        <div className="Home-image">
          <img src={images[currentIndex]} alt="Houseclean service" className="slide-img" /> 
          <div className="controls"> {images.map((_, index) => ( 
            <button key={index} className={index === currentIndex ? "dot active" : "dot"} 
            onClick={() => setCurrentIndex(index)} ></button> ))} </div>
        </div>
    </section>
  );
}

export default Home;
